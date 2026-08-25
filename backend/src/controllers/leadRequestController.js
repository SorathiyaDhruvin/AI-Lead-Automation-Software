const leadRequestModel = require("../models/leadRequestModel");
const leadModel = require("../models/leadModel");
const activityModel = require("../models/activityModel");
const notificationModel = require("../models/notificationModel");
const emailService = require("../services/emailService");
const emailLogModel = require("../models/emailLogModel");
const automationEngine = require("../services/automationEngine");
const { asyncHandler } = require("../middleware/errorHandler");

const mapToCamelCase = (row) => {
    if (!row) return null;
    return {
        ...row,
        requestType: row.request_type,
        companyName: row.company_name,
        contactName: row.contact_name,
        email: row.email,
        phone: row.phone,
        numberOfLeads: row.number_of_leads,
        industry: row.industry,
        budget: row.budget,
        description: row.description,
        additionalNotes: row.additional_notes,
        priority: row.priority,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        adminNotes: row.admin_notes,
        reviewedBy: row.reviewed_by,
        reviewedAt: row.reviewed_at,
    };
};

const getRequests = asyncHandler(async (req, res) => {
    const requests = await leadRequestModel.getByUser(req.userId);
    res.json({ success: true, data: requests.map(mapToCamelCase) });
});

const createRequest = asyncHandler(async (req, res) => {
    const { requestType, companyName, contactName, email, phone, numberOfLeads, industry, budget, description, additionalNotes, priority } = req.body;
    
    if (!companyName || !contactName || !email || !description) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const request = await leadRequestModel.create({
        userId: req.userId,
        requestType,
        companyName,
        contactName,
        email,
        phone,
        numberOfLeads,
        industry,
        budget,
        description,
        additionalNotes,
        priority,
    });

    res.status(201).json({ success: true, data: mapToCamelCase(request) });
});

const getRequestById = asyncHandler(async (req, res) => {
    const request = await leadRequestModel.getById(req.params.id);
    if (!request) {
        return res.status(404).json({ success: false, message: "Lead request not found" });
    }

    if (request.user_id !== req.userId && req.userRole !== "admin") {
        return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({ success: true, data: mapToCamelCase(request) });
});

// Admin Controllers
const adminGetRequests = asyncHandler(async (req, res) => {
    const requests = await leadRequestModel.getAll();
    res.json({ success: true, data: requests.map(mapToCamelCase) });
});

const adminUpdateStatus = asyncHandler(async (req, res) => {
    const { status, adminNotes } = req.body;
    if (!status) {
        return res.status(400).json({ success: false, message: "Status is required" });
    }

    const request = await leadRequestModel.getById(req.params.id);
    if (!request) {
        return res.status(404).json({ success: false, message: "Lead request not found" });
    }

    // Prevent re-processing if already at this status
    if (request.status === status) {
        return res.json({ success: true, data: mapToCamelCase(request), message: "Status unchanged" });
    }

    const updated = await leadRequestModel.update(req.params.id, {
        status,
        adminNotes,
        reviewedBy: req.userId,
        reviewedAt: new Date()
    });

    // ── APPROVED: Create lead from request data ──
    if (status === "approved") {
        try {
            // Check for duplicate — don't create a lead if one with the same email already exists for this user
            const existingLeads = await leadModel.getByUser(request.user_id, { search: request.email });
            const duplicate = existingLeads.find(l => l.email.toLowerCase() === request.email.toLowerCase());

            let lead;
            if (duplicate) {
                lead = duplicate;
                console.log(`[LeadRequest] Lead already exists for ${request.email}, skipping creation`);
            } else {
                lead = await leadModel.create({
                    userId: request.user_id,
                    name: request.contact_name,
                    email: request.email,
                    company: request.company_name,
                    phone: request.phone,
                    source: "lead_request",
                    status: "new",
                    notes: request.description,
                });

                // Log activity
                await activityModel.create({
                    leadId: lead.id,
                    userId: request.user_id,
                    type: "lead_created",
                    description: `Lead created from approved request (industry: ${request.industry || "N/A"})`,
                });
            }

            // Notification to the request owner
            await notificationModel.create({
                userId: request.user_id,
                type: "request_approved",
                message: `Your lead request for "${request.company_name}" has been approved`,
            });

            // Trigger automation for lead_request_approved event
            automationEngine.triggerEvent("lead_request_approved", lead, request.user_id)
                .catch(err => console.error("[LeadRequest] Automation trigger error:", err.message));

        } catch (err) {
            console.error("[LeadRequest] Error processing approval:", err.message);
        }
    }

    // ── REJECTED: Log activity and optionally notify ──
    if (status === "rejected") {
        await notificationModel.create({
            userId: request.user_id,
            type: "request_rejected",
            message: `Your lead request for "${request.company_name}" has been rejected${adminNotes ? `: ${adminNotes}` : ""}`,
        }).catch(err => console.error("[LeadRequest] Notification error:", err.message));
    }

    // ── UNIFIED EMAIL SENDING LOGIC ──
    console.log(`[LeadRequest] Lead request status updated: ${request.status} -> ${status}`);
    
    if (emailService.isConfigured()) {
        const leadEmail = request.email;
        const leadName = request.contact_name;
        
        let subject = "";
        switch (status) {
            case "pending": subject = "Your Lead Request is Pending - LeadFlow AI"; break;
            case "in_review": subject = "Your Lead Request is Under Review - LeadFlow AI"; break;
            case "approved": subject = "Your Lead Request Has Been Approved - LeadFlow AI"; break;
            case "rejected": subject = "Your Lead Request Has Been Rejected - LeadFlow AI"; break;
            default: subject = "Lead Request Status Update - LeadFlow AI";
        }
        
        // Attempt to find a lead ID if one exists, for activity logging purposes
        let leadIdForLog = null;
        try {
            const existingLeads = await leadModel.getByUser(request.user_id, { search: leadEmail });
            const matchingLead = existingLeads.find(l => l.email.toLowerCase() === leadEmail.toLowerCase());
            if (matchingLead) leadIdForLog = matchingLead.id;
        } catch(e) {}
        
        try {
            const emailLog = await emailLogModel.create({
                leadId: leadIdForLog,
                userId: request.user_id,
                recipient: leadEmail,
                subject: subject,
                status: "pending",
            });

            // Fire and forget email delivery
            emailService.sendEmail({
                to: leadEmail,
                subject: subject,
                html: emailService.buildStatusUpdateEmail(leadName, status, adminNotes)
            }).then(result => {
                emailLogModel.updateStatus(emailLog.id, "sent", result?.id || null, null);
                if (leadIdForLog) {
                    activityModel.create({
                        leadId: leadIdForLog,
                        userId: request.user_id,
                        type: "email_sent",
                        description: `Status update email (${status}) sent to ${leadEmail}`,
                    });
                }
                console.log(`[LeadRequest] Status update email sent to: ${leadEmail}`);
            }).catch(err => {
                emailLogModel.updateStatus(emailLog.id, "failed", null, err.message);
                if (leadIdForLog) {
                    activityModel.create({
                        leadId: leadIdForLog,
                        userId: request.user_id,
                        type: "email_failed",
                        description: `Status update email (${status}) failed: ${err.message}`,
                    });
                }
                console.error(`[LeadRequest] Status update email failed for: ${leadEmail}`);
            });
        } catch (error) {
             console.error(`[LeadRequest] Failed to initiate email log for: ${leadEmail}`, error.message);
        }
    }

    res.json({ success: true, data: mapToCamelCase(updated) });
});

const adminGetStats = asyncHandler(async (req, res) => {
    const requests = await leadRequestModel.getAll();
    const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === "pending").length,
        approved: requests.filter(r => r.status === "approved").length,
        rejected: requests.filter(r => r.status === "rejected").length,
        inReview: requests.filter(r => r.status === "in_review").length,
    };
    res.json({ success: true, data: stats });
});

module.exports = {
    getRequests,
    createRequest,
    getRequestById,
    adminGetRequests,
    adminUpdateStatus,
    adminGetStats
};
