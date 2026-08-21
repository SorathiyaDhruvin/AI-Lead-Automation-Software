const leadRequestModel = require("../models/leadRequestModel");
const { asyncHandler } = require("../middleware/errorHandler");

const getRequests = asyncHandler(async (req, res) => {
    const requests = await leadRequestModel.getByUser(req.userId);
    res.json({ success: true, data: requests });
});

const createRequest = asyncHandler(async (req, res) => {
    const { companyName, contactName, email, phone, industry, budget, description, priority } = req.body;
    
    if (!companyName || !contactName || !email || !description) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const request = await leadRequestModel.create({
        userId: req.userId,
        companyName,
        contactName,
        email,
        phone,
        industry,
        budget,
        description,
        priority,
    });

    res.status(201).json({ success: true, data: request });
});

const getRequestById = asyncHandler(async (req, res) => {
    const request = await leadRequestModel.getById(req.params.id);
    if (!request) {
        return res.status(404).json({ success: false, message: "Lead request not found" });
    }

    if (request.user_id !== req.userId && req.userRole !== "admin") {
        return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({ success: true, data: request });
});

// Admin Controllers
const adminGetRequests = asyncHandler(async (req, res) => {
    const requests = await leadRequestModel.getAll();
    res.json({ success: true, data: requests });
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

    const updated = await leadRequestModel.update(req.params.id, {
        status,
        adminNotes,
        reviewedBy: req.userId,
        reviewedAt: new Date()
    });

    res.json({ success: true, data: updated });
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
