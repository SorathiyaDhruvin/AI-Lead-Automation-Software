const { GoogleGenAI } = require("@google/genai");

let _ai = null;

function getAIClient() {
    if (!_ai) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return null;
        }
        _ai = new GoogleGenAI({ apiKey });
    }
    return _ai;
}

/**
 * Score a lead using Google Gemini.
 * Returns parsed structured JSON score object.
 */
async function scoreLead(lead) {
    const ai = getAIClient();
    if (!ai) {
        throw new Error("GEMINI_API_KEY is missing. Please configure it in environment variables.");
    }

    const model = process.env.AI_MODEL || "gemini-3.6-flash";
    const prompt = `
    You are an expert AI lead scoring assistant. Evaluate this lead and provide a score, category (Hot, Warm, or Cold), rating (high, medium, or low), prediction, insights, strengths, weaknesses, and a recommendation.

    Lead Details:
    - Name: ${lead.name}
    - Email: ${lead.email}
    - Company: ${lead.company || "Not provided"}
    - Phone: ${lead.phone || "Not provided"}
    - Source: ${lead.source || "manual"}
    - Current Status: ${lead.status || "new"}
    - Job Title/Designation: ${lead.occupation || "Not provided"}
    - Department/Industry: ${lead.department || "Not provided"}
    - Notes: ${lead.notes || "None"}

    Respond strictly in JSON format matching this schema:
    {
      "score": <integer from 0 to 100>,
      "category": "Hot" | "Warm" | "Cold",
      "rating": "high" | "medium" | "low",
      "prediction": "<one sentence prediction about conversion likelihood>",
      "insights": "<2-3 key insights summary>",
      "strengths": ["<strength 1>", "<strength 2>"],
      "weaknesses": ["<weakness 1>"],
      "recommendation": "<specific recommended action for the sales team>"
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        if (!response.text) {
            throw new Error("Gemini returned an empty response.");
        }

        const data = JSON.parse(response.text.trim());
        
        // Normalize/validate data
        data.score = Math.min(100, Math.max(0, parseInt(data.score) || 50));
        
        const validCategories = ["Hot", "Warm", "Cold"];
        if (!validCategories.includes(data.category)) {
            data.category = data.score >= 70 ? "Hot" : data.score >= 40 ? "Warm" : "Cold";
        }
        
        const validRatings = ["high", "medium", "low"];
        if (!validRatings.includes(data.rating)) {
            data.rating = data.score >= 70 ? "high" : data.score >= 40 ? "medium" : "low";
        }

        data.strengths = Array.isArray(data.strengths) ? data.strengths : [];
        data.weaknesses = Array.isArray(data.weaknesses) ? data.weaknesses : [];

        return data;
    } catch (err) {
        console.error("Gemini Scoring Error:", err);
        throw new Error("Gemini model unavailable or returned malformed data: " + err.message);
    }
}

/**
 * Perform lead auto-segmentation using Google Gemini.
 */
async function autoSegmentLeads(leads) {
    const ai = getAIClient();
    if (!ai) {
        throw new Error("GEMINI_API_KEY is missing. Please configure it in environment variables.");
    }

    const model = process.env.AI_MODEL || "gemini-3.6-flash";
    const leadSummary = leads.map(l => ({
        id: l.id,
        name: l.name,
        company: l.company,
        source: l.source,
        status: l.status,
        score: l.ai_score || 50,
        jobTitle: l.occupation,
        department: l.department
    }));

    const prompt = `
    You are an AI data segmentation expert. Analyze these leads and categorize them into 3 to 5 meaningful segments based on patterns you observe (e.g. Industry, High Value, Nurture Needed).
    Assign every lead ID to exactly one segment. Do not invent lead IDs. Use only the provided lead IDs.

    Leads Data:
    ${JSON.stringify(leadSummary, null, 2)}

    Respond strictly in JSON format matching this schema:
    {
      "segments": [
        {
          "name": "<segment name>",
          "description": "<short description>",
          "criteria": "<criteria used for grouping>",
          "color": "<hex color code e.g. #FF6B6B>",
          "leadIds": ["<lead id 1>", "<lead id 2>"]
        }
      ]
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        if (!response.text) {
            throw new Error("Gemini returned an empty response.");
        }

        const data = JSON.parse(response.text.trim());
        if (!data.segments || !Array.isArray(data.segments)) {
            throw new Error("Invalid segments format returned from Gemini.");
        }
        return data.segments;
    } catch (err) {
        console.error("Gemini Segmentation Error:", err);
        throw new Error("AI auto-segmentation failed: " + err.message);
    }
}

module.exports = {
    getAIClient,
    scoreLead,
    autoSegmentLeads
};
