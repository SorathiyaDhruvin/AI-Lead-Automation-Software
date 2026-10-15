const { GoogleGenAI } = require("@google/genai");
const { OpenAI } = require("openai");

let _openai = null;
let _gemini = null;

const GEMINI_FALLBACK_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.5-flash-lite"
];

function getAIClient() {
    // 1. Check for OpenAI configuration (Replit AI or custom OpenAI / Google AI OpenAI-compatible endpoint)
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

function getModelCandidates(type, requestedModel) {
    const openAIBaseURL = process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    const isGoogleEndpoint = type === "openai" && openAIBaseURL && openAIBaseURL.includes("generativelanguage.googleapis.com");

    if (type === "gemini" || isGoogleEndpoint) {
        let initial = requestedModel || process.env.AI_MODEL || "gemini-3.8-flash";
        // If it's a legacy or unavailable model name, update to modern working model
        if (
            initial.startsWith("gpt-") || 
            initial.startsWith("gpt4") || 
            initial.startsWith("gpt5") || 
            initial === "gemini-3.6-flash" || 
            initial === "gemini-2.5-flash" || 
            initial === "gemini-2.0-flash" || 
            initial === "gemini-1.5-flash"
        ) {
            initial = "gemini-3.8-flash";
        }
        return Array.from(new Set([initial, ...GEMINI_FALLBACK_MODELS]));
    } else {
        const initial = requestedModel || "gpt-4o-mini";
        return Array.from(new Set([initial, "gpt-4o-mini", "gpt-4o"]));
    }
}

async function requestAICompletion({ client, type, prompt, preferredModel, systemPrompt }) {
    const candidateModels = getModelCandidates(type, preferredModel);
    let lastError = null;

    for (const model of candidateModels) {
        try {
            if (type === "openai") {
                const messages = [];
                if (systemPrompt) {
                    messages.push({ role: "system", content: systemPrompt });
                }
                messages.push({ role: "user", content: prompt });

                const response = await client.chat.completions.create({
                    model,
                    messages,
                    response_format: { type: "json_object" }
                });

                const content = response.choices?.[0]?.message?.content;
                if (content) return content;
            } else {
                const response = await client.models.generateContent({
                    model,
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json"
                    }
                });
                const content = response.text;
                if (content) return content;
            }
        } catch (err) {
            console.warn(`[geminiService] Model "${model}" failed (${err.status || err.code || err.message}). Attempting next fallback...`);
            lastError = err;
        }
    }

    throw lastError || new Error("All AI models failed to return a response.");
}

function parseAIJsonResponse(rawResponse) {
    if (!rawResponse) {
        throw new Error("AI returned an empty response.");
    }
    let contentStr = rawResponse.trim();
    if (contentStr.includes("```")) {
        contentStr = contentStr.replace(/```json/gi, "").replace(/```/g, "").trim();
    }
    return JSON.parse(contentStr);
}

/**
 * Score a lead using Google Gemini or OpenAI with automatic model fallback.
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
        const rawResponse = await requestAICompletion({
            client,
            type,
            prompt,
            preferredModel: process.env.LEAD_SCORING_MODEL || process.env.AI_MODEL,
            systemPrompt: "You are an expert AI lead scoring assistant. Respond strictly in JSON format matching the requested schema."
        });

        const data = parseAIJsonResponse(rawResponse);
        
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
 * Perform lead auto-segmentation using Google Gemini or OpenAI with automatic fallback.
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
        const rawResponse = await requestAICompletion({
            client,
            type,
            prompt,
            preferredModel: process.env.LEAD_SEGMENTATION_MODEL || process.env.AI_MODEL,
            systemPrompt: "You are an AI data segmentation expert. Respond strictly in JSON format matching the requested schema."
        });

        const data = parseAIJsonResponse(rawResponse);
        if (!data.segments || !Array.isArray(data.segments)) {
            throw new Error("Invalid segments format returned from AI.");
        }
        return data.segments;
    } catch (err) {
        console.error("AI Segmentation Error:", err);
        throw new Error("AI auto-segmentation failed: " + err.message);
    }
}

/**
 * Generate a personalized sales email using AI with automatic fallback.
 */
async function generateEmail({ lead, objective = "Initial outreach & product pitch", tone = "Professional & Persuasive", previousInteractions = "" }) {
    const aiInstance = getAIClient();
    if (!aiInstance) {
        throw new Error("No AI API key found. Please configure OPENAI_API_KEY or GEMINI_API_KEY.");
    }
    const { client, type } = aiInstance;

    const prompt = `
    You are an elite B2B sales copywriter. Write a highly personalized sales email tailored specifically to this lead.

    Lead Context:
    - Name: ${lead.name}
    - Company: ${lead.company || "their company"}
    - Email: ${lead.email}
    - Source: ${lead.source || "manual"}
    - Status: ${lead.status || "new"}
    - Job Title: ${lead.occupation || "Decision Maker"}
    - Department: ${lead.department || "Business Operations"}
    - Notes / Context: ${lead.notes || "None"}
    - Previous Interactions: ${previousInteractions || "None"}

    Parameters:
    - Desired Objective: ${objective}
    - Tone: ${tone}

    Respond strictly in JSON format matching this schema:
    {
      "subject": "<compelling non-spammy email subject line>",
      "body": "<personalized HTML formatted email body with line breaks and clear value proposition>",
      "cta": "<clear single call-to-action button or question>"
    }
    `;

    try {
        const rawResponse = await requestAICompletion({
            client,
            type,
            prompt,
            preferredModel: process.env.LEAD_SCORING_MODEL || process.env.AI_MODEL,
            systemPrompt: "You are an elite B2B sales copywriter. Respond strictly in valid JSON."
        });

        return parseAIJsonResponse(rawResponse);
    } catch (err) {
        console.error("AI Email Generation Error:", err);
        throw new Error("AI email generation failed: " + err.message);
    }
}

/**
 * Generate a smart follow-up email with automatic fallback.
 */
async function generateFollowUp({ lead, step = 1, previousEmails = "", objective = "Re-engage lead" }) {
    const aiInstance = getAIClient();
    if (!aiInstance) {
        throw new Error("No AI API key found. Please configure OPENAI_API_KEY or GEMINI_API_KEY.");
    }
    const { client, type } = aiInstance;

    const prompt = `
    You are an expert sales follow-up assistant. Write a polite, non-intrusive, value-adding follow-up email for sequence step #${step}.

    Lead Info:
    - Name: ${lead.name}
    - Company: ${lead.company || "their company"}
    - Status: ${lead.status || "contacted"}
    - AI Category: ${lead.ai_category || "Warm"}
    - Previous Sent Emails Summary: ${previousEmails || "Initial outreach sent previously"}
    - Sequence Step: #${step}
    - Goal: ${objective}

    Respond strictly in JSON format matching this schema:
    {
      "subject": "<follow up subject line>",
      "body": "<personalized follow up body HTML>",
      "delayDays": <recommended days to wait before sending next follow up>
    }
    `;

    try {
        const rawResponse = await requestAICompletion({
            client,
            type,
            prompt,
            preferredModel: process.env.LEAD_SCORING_MODEL || process.env.AI_MODEL,
            systemPrompt: "You are an expert sales follow-up assistant. Respond strictly in valid JSON."
        });

        return parseAIJsonResponse(rawResponse);
    } catch (err) {
        console.error("AI Follow-up Generation Error:", err);
        throw new Error("AI follow-up generation failed: " + err.message);
    }
}

/**
 * Analyze an incoming lead reply and suggest a response with automatic fallback.
 */
async function analyzeReply({ lead, replyText }) {
    const aiInstance = getAIClient();
    if (!aiInstance) {
        throw new Error("No AI API key found. Please configure OPENAI_API_KEY or GEMINI_API_KEY.");
    }
    const { client, type } = aiInstance;

    const prompt = `
    You are an AI reply assistant analyzing an incoming email response from a sales lead.

    Lead Context:
    - Name: ${lead.name}
    - Company: ${lead.company || "their company"}
    - Email: ${lead.email}

    Incoming Lead Reply Text:
    "${replyText}"

    Tasks:
    1. Identify intent (Interested | Not Interested | Needs Info | Pricing Question | Wants Meeting | Objection | Wrong Person | Unsubscribe).
    2. Identify sentiment (Positive | Neutral | Negative).
    3. Provide confidence score (0 to 100).
    4. Draft a professional, highly relevant suggested response.

    Respond strictly in JSON format matching this schema:
    {
      "intent": "<Detected Intent>",
      "sentiment": "Positive" | "Neutral" | "Negative",
      "confidence": <integer 0-100>,
      "suggestedResponse": "<draft response email text>"
    }
    `;

    try {
        const rawResponse = await requestAICompletion({
            client,
            type,
            prompt,
            preferredModel: process.env.LEAD_SCORING_MODEL || process.env.AI_MODEL,
            systemPrompt: "You are an AI sales reply assistant. Respond strictly in valid JSON."
        });

        return parseAIJsonResponse(rawResponse);
    } catch (err) {
        console.error("AI Reply Analysis Error:", err);
        throw new Error("AI reply analysis failed: " + err.message);
    }
}

module.exports = {
    getAIClient,
    scoreLead,
    autoSegmentLeads,
    generateEmail,
    generateFollowUp,
    analyzeReply
};
