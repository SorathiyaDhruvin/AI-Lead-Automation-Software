const segmentModel = require("../models/segmentModel");
const leadModel = require("../models/leadModel");
const geminiService = require("../services/geminiService");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * GET /api/segments
 */
const getSegments = asyncHandler(async (req, res) => {
    const segments = await segmentModel.getByUser(req.userId);
    res.json({ success: true, data: segments });
});

/**
 * POST /api/segments
 */
const createSegment = asyncHandler(async (req, res) => {
    const { name, description, criteria, color } = req.body;
    if (!name) {
        return res.status(400).json({ success: false, message: "Segment name is required" });
    }

    const existing = await segmentModel.getByUser(req.userId);
    const duplicate = existing.find(s => s.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (duplicate) {
        return res.status(409).json({ success: false, message: `A segment named "${name}" already exists.` });
    }

    try {
        const segment = await segmentModel.create({
            userId: req.userId,
            name: name.trim(),
            description: description || null,
            criteria: criteria ? (typeof criteria === 'object' ? JSON.stringify(criteria) : criteria) : null,
            color: color || '#3b82f6'
        });

        res.status(201).json({ success: true, data: segment });
    } catch (error) {
        console.error("[CREATE SEGMENT ERROR]", error);
        res.status(500).json({ success: false, message: "Failed to create segment: " + error.message });
    }
});

/**
 * PATCH /api/segments/:id
 */
const updateSegment = asyncHandler(async (req, res) => {
    const { name, description, criteria, color, lead_count } = req.body;
    
    // Check if segment exists
    const segment = await segmentModel.update(req.params.id, {
        name,
        description,
        criteria,
        color,
        lead_count
    });

    if (!segment) {
        return res.status(404).json({ success: false, message: "Segment not found" });
    }

    res.json({ success: true, data: segment });
});

/**
 * DELETE /api/segments/:id
 */
const deleteSegment = asyncHandler(async (req, res) => {
    const deleted = await segmentModel.delete(req.params.id);
    if (!deleted) {
        return res.status(404).json({ success: false, message: "Segment not found" });
    }
    res.status(204).send();
});

/**
 * POST /api/segments/auto-segment
 */
const autoSegment = asyncHandler(async (req, res) => {
    const leads = await leadModel.getByUser(req.userId);
    if (!leads || leads.length === 0) {
        return res.status(400).json({ success: false, message: "No leads found to segment." });
    }

    try {
        const aiSegments = await geminiService.autoSegmentLeads(leads);
        
        for (const seg of aiSegments) {
            let segmentRecord = await segmentModel.getByName(req.userId, seg.name);
            
            if (!segmentRecord) {
                segmentRecord = await segmentModel.create({
                    userId: req.userId,
                    name: seg.name,
                    description: seg.description,
                    criteria: seg.criteria,
                    color: seg.color || "#3b82f6",
                    leadCount: seg.leadIds ? seg.leadIds.length : 0
                });
            } else {
                segmentRecord = await segmentModel.update(segmentRecord.id, {
                    description: seg.description,
                    criteria: seg.criteria,
                    color: seg.color || segmentRecord.color,
                    lead_count: seg.leadIds ? seg.leadIds.length : 0
                });
            }

            if (seg.leadIds && Array.isArray(seg.leadIds)) {
                for (const leadId of seg.leadIds) {
                    // Check if lead belongs to the user before assigning
                    const lead = await leadModel.getById(leadId);
                    if (lead && lead.user_id === req.userId) {
                        await leadModel.update(leadId, { segment_id: segmentRecord.id });
                    }
                }
            }
        }

        const segments = await segmentModel.getByUser(req.userId);
        res.json({ success: true, data: segments });

    } catch (error) {
        console.error("Auto-Segmentation Controller Error:", error.message);
        res.status(500).json({ success: false, message: "Auto-segmentation failed: " + error.message });
    }
});

module.exports = {
    getSegments,
    createSegment,
    updateSegment,
    deleteSegment,
    autoSegment
};
