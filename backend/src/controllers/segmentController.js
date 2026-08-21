const segmentModel = require("../models/segmentModel");
const leadModel = require("../models/leadModel");
const { asyncHandler } = require("../middleware/errorHandler");
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

/**
 * GET /api/segments
 * Get all segments for the authenticated user.
 */
const getSegments = asyncHandler(async (req, res) => {
    const segments = await segmentModel.getByUser(req.userId);
    res.json({ success: true, data: segments });
});

/**
 * POST /api/segments/auto-segment
 * Auto-segment all leads using AI.
 */
const autoSegment = asyncHandler(async (req, res) => {
    if (!ai.apiKey) {
        return res.status(500).json({ success: false, message: "Gemini API key is not configured on the server." });
    }

    const leads = await leadModel.getByUser(req.userId);
    if (!leads || leads.length === 0) {
        return res.status(400).json({ success: false, message: "No leads found to segment." });
    }

    try {
        const leadData = leads.map(l => ({
            id: l.id,
            company: l.company,
            jobTitle: l.occupation,
            status: l.status,
            score: l.ai_score,
            source: l.source
        }));

        const prompt = `
        Analyze the following leads and categorize them into 3-5 meaningful segments. 
        Assign each lead to exactly one segment. Do not invent leads.
        Return the output STRICTLY as a JSON object in this format:
        {
            "segments": [
                {
                    "name": "Segment Name (e.g. Hot Leads, Tech Companies, Decision Makers)",
                    "description": "Short description of the segment",
                    "criteria": "Criteria used for this segment",
                    "color": "Hex color code starting with #",
                    "leadIds": ["id1", "id2"]
                }
            ]
        }
        
        Leads:
        ${JSON.stringify(leadData)}
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        const aiResponse = JSON.parse(response.text);
        if (!aiResponse.segments || !Array.isArray(aiResponse.segments)) {
            throw new Error("Invalid AI response format.");
        }

        const createdSegments = [];

        for (const seg of aiResponse.segments) {
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
                    await leadModel.update(leadId, { segment_id: segmentRecord.id });
                }
            }

            createdSegments.push(segmentRecord);
        }

        // Return the newly created/updated segments matching the frontend format
        // Frontend expects an array of segments directly (apiClient.post<Segment[]>)
        res.json(createdSegments.map(s => ({
            id: s.id,
            userId: s.user_id,
            name: s.name,
            description: s.description,
            criteria: s.criteria,
            color: s.color,
            leadCount: s.lead_count,
            createdAt: s.created_at
        })));

    } catch (error) {
        console.error("AI Segmentation Error:", error);
        res.status(500).json({ success: false, message: "Failed to auto-segment leads. " + error.message });
    }
});

module.exports = { getSegments, autoSegment };
