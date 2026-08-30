const { GoogleGenAI } = require("@google/genai");
const { OpenAI } = require("openai");

let _openai = null;
let _gemini = null;

function getAIClient() {
    // 1. Check for OpenAI configuration (Replit AI or custom OpenAI)
    const openAIKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    const openAIBaseURL = process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

    if (openAIKey) {
        if (!_openai) {
            _openai = new OpenAI({
                apiKey: openAIKey,
                ...(openAIBaseURL ? { baseURL: openAIBaseURL } : {})
            });
        }
        return { client: _openai, type: "openai" };
    }

    // 2. Fallback to Gemini GoogleGenAI
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
        if (!_gemini) {
            _gemini = new GoogleGenAI({ apiKey: geminiKey });
        }
        return { client: _gemini, type: "gemini" };
    }

    return null;
}

/**
 * Score a lead using Google Gemini or OpenAI.
 * Returns parsed structured JSON score object.
 */
async function scoreLead(lead) {
    const aiInstance = getAIClient();
    if (!aiInstance) {
        throw new Error("No AI API key found. Please configure OPENAI_API_KEY or GEMINI_API_KEY in environment variables.");
    }

    const { client, type } = aiInstance;

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
        let rawResponse = "";

        if (type === "openai") {
            const scoringModel = process.env.LEAD_SCORING_MODEL || "gpt-4o-mini";
            const response = await client.chat.completions.create({
                model: scoringModel,
                messages: [
                    { role: "system", content: "You are an expert AI lead scoring assistant. Respond strictly in JSON format matching the requested schema." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
            });
            rawResponse = response.choices[0].message.content;
        } else {
            const model = process.env.AI_MODEL || "gemini-3.6-flash";
            const response = await client.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json"
                }
            });
            rawResponse = response.text;
        }

        if (!rawResponse) {
            throw new Error("AI returned an empty response.");
        }

        let contentStr = rawResponse.trim();
        // Handle markdown code block wrap if returned
        if (contentStr.includes("```")) {
            contentStr = contentStr.replace(/```json/g, "").replace(/```/g, "").trim();
        }

        const data = JSON.parse(contentStr);
        
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
        console.error("AI Scoring Error:", err);
        throw new Error("AI model unavailable or returned malformed data: " + err.message);
    }
}

/**
 * Perform lead auto-segmentation using Google Gemini or OpenAI.
 */
async function autoSegmentLeads(leads) {
    const aiInstance = getAIClient();
    if (!aiInstance) {
        throw new Error("No AI API key found. Please configure OPENAI_API_KEY or GEMINI_API_KEY in environment variables.");
    }

    const { client, type } = aiInstance;

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
        let rawResponse = "";

        if (type === "openai") {
            const segmentModel = process.env.LEAD_SEGMENTATION_MODEL || "gpt-5-mini";
            const response = await client.chat.completions.create({
                model: segmentModel,
                messages: [
                    { role: "system", content: "You are an AI data segmentation expert. Respond strictly in JSON format matching the requested schema." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
            });
            rawResponse = response.choices[0].message.content;
        } else {
            const model = process.env.AI_MODEL || "gemini-3.6-flash";
            const response = await client.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json"
                }
            });
            rawResponse = response.text;
        }

        if (!rawResponse) {
            throw new Error("AI returned an empty response.");
        }

        let contentStr = rawResponse.trim();
        if (contentStr.includes("```")) {
            contentStr = contentStr.replace(/```json/g, "").replace(/```/g, "").trim();
        }

        const data = JSON.parse(contentStr);
        if (!data.segments || !Array.isArray(data.segments)) {
            throw new Error("Invalid segments format returned from AI.");
        }
        return data.segments;
    } catch (err) {
        console.error("AI Segmentation Error:", err);
        throw new Error("AI auto-segmentation failed: " + err.message);
    }
}

module.exports = {
    getAIClient,
    scoreLead,
    autoSegmentLeads
};

