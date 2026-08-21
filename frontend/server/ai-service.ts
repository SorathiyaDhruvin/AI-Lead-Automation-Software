import type { Lead } from "@shared/schema";

interface ScoreResult {
  score: number;
  category: string;
  prediction: string;
  insights: string;
  recommendedAction: string;
}

interface SegmentResult {
  segmentName: string;
  segmentColor: string;
  description: string;
}

function getOpenAIClient() {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.x.ai/v1";
  
  if (!apiKey) {
    return null;
  }
  
  // Dynamic import to avoid initialization issues
  const OpenAI = require("openai").default;
  return new OpenAI({ apiKey, baseURL });
}

function calculateFallbackScore(lead: Lead): ScoreResult {
  throw new Error("AI Scoring requires a valid AI provider configuration. Mock/fallback data has been disabled in production.");
}

export async function scoreLead(lead: Lead): Promise<ScoreResult> {
  const openai = getOpenAIClient();
  
  if (!openai) {
    return calculateFallbackScore(lead);
  }

  const prompt = `You are an AI lead scoring expert. Analyze the following lead and provide:
1. A score from 0-100 (higher = more likely to convert)
2. A category: exactly one of "Hot", "Warm", or "Cold"
3. A brief prediction about conversion likelihood
4. Key insights about this lead (2-3 sentences)
5. A specific recommended next action for the sales team

Lead Information:
- Name: ${lead.name}
- Email: ${lead.email}
- Company: ${lead.company || "Not provided"}
- Phone: ${lead.phone || "Not provided"}
- Source: ${lead.source}
- Current Status: ${lead.status}
- Notes: ${lead.notes || "None"}

Scoring guidance: Hot = score >= 70, Warm = score 40-69, Cold = score < 40

Respond in JSON format:
{
  "score": <number 0-100>,
  "category": "Hot" | "Warm" | "Cold",
  "prediction": "<one sentence prediction>",
  "insights": "<2-3 key insights about this lead>",
  "recommendedAction": "<specific actionable next step for the sales team>"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gemini-3.7-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const result = JSON.parse(content);
    const score = Math.min(100, Math.max(0, result.score || 50));

    let category = result.category;
    if (!["Hot", "Warm", "Cold"].includes(category)) {
      category = score >= 70 ? "Hot" : score >= 40 ? "Warm" : "Cold";
    }

    return {
      score,
      category,
      prediction: result.prediction || "Unable to make prediction",
      insights: result.insights || "No insights available",
      recommendedAction: result.recommendedAction || "Follow up with the lead to understand their needs.",
    };
  } catch (error) {
    console.error("AI scoring error:", error);
    return calculateFallbackScore(lead);
  }
}

export async function segmentLeads(leads: Lead[]): Promise<Map<string, SegmentResult>> {
  if (leads.length === 0) {
    return new Map();
  }

  const openai = getOpenAIClient();
  
  // If no AI available, throw error instead of rule-based
  if (!openai) {
    throw new Error("AI Auto-Segmentation requires a valid AI provider configuration. Mock data disabled.");
  }

  const leadSummary = leads.map((l) => ({
    id: l.id,
    name: l.name,
    company: l.company,
    source: l.source,
    status: l.status,
    score: l.aiScore,
  }));

  const prompt = `You are an AI segmentation expert. Analyze the following leads and assign each to one of 3-5 segments.

Leads:
${JSON.stringify(leadSummary, null, 2)}

Create meaningful segments based on patterns you observe (e.g., "Enterprise Prospects", "Small Business", "Hot Leads", "Nurture Required", etc.)

Respond in JSON format:
{
  "segments": [
    {
      "name": "<segment name>",
      "color": "<hex color>",
      "description": "<brief description>",
      "leadIds": ["<lead id>", ...]
    }
  ]
}

Use these colors: #0066FF, #6C5CE7, #00D68F, #FFB946, #FF6B6B, #4ECDC4`;

  try {
    const response = await openai.chat.completions.create({
      model: "gemini-3.7-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const result = JSON.parse(content);

    const segmentMap = new Map<string, SegmentResult>();
    
    for (const segment of result.segments || []) {
      for (const leadId of segment.leadIds || []) {
        segmentMap.set(leadId, {
          segmentName: segment.name,
          segmentColor: segment.color,
          description: segment.description,
        });
      }
    }

    return segmentMap;
  } catch (error) {
    console.error("AI segmentation error:", error);
    return new Map();
  }
}
