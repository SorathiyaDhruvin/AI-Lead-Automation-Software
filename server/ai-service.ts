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
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  
  if (!apiKey) {
    return null;
  }
  
  // Dynamic import to avoid initialization issues
  const OpenAI = require("openai").default;
  return new OpenAI({ apiKey, baseURL });
}

function calculateFallbackScore(lead: Lead): ScoreResult {
  const baseScore = 40;
  const hasCompany = lead.company ? 15 : 0;
  const hasPhone = lead.phone ? 10 : 0;
  const hasNotes = lead.notes ? 5 : 0;
  
  const sourceBonus = {
    referral: 15,
    website: 10,
    social: 8,
    email: 7,
    ads: 6,
    event: 5,
    other: 3,
  }[lead.source] || 5;

  const statusBonus = {
    negotiation: 15,
    proposal: 12,
    qualified: 10,
    contacted: 5,
    new: 0,
    lost: -20,
  }[lead.status] || 0;

  const score = Math.min(100, Math.max(0, baseScore + hasCompany + hasPhone + hasNotes + sourceBonus + statusBonus));

  let category: string;
  let prediction: string;
  let recommendedAction: string;

  if (score >= 70) {
    category = "Hot";
    prediction = "Based on available information, this lead shows strong potential for conversion.";
    recommendedAction = "Schedule a discovery call within 24 hours and prepare a tailored proposal.";
  } else if (score >= 40) {
    category = "Warm";
    prediction = "Based on available information, this lead shows moderate potential with room for nurturing.";
    recommendedAction = "Send a personalized follow-up email with relevant case studies and check in next week.";
  } else {
    category = "Cold";
    prediction = "Based on available information, this lead shows early-stage interest requiring further engagement.";
    recommendedAction = "Add to nurturing sequence. Share educational content and re-evaluate in 30 days.";
  }

  return {
    score,
    category,
    prediction,
    insights: "Score calculated using lead attributes. Enable AI integration for deeper insights.",
    recommendedAction,
  };
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
      model: "gpt-4o-mini",
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
  
  // If no AI available, use rule-based segmentation
  if (!openai) {
    const segmentMap = new Map<string, SegmentResult>();
    
    for (const lead of leads) {
      const score = lead.aiScore || 50;
      let segment: SegmentResult;
      
      if (score >= 70) {
        segment = {
          segmentName: "Hot Leads",
          segmentColor: "#00D68F",
          description: "High-scoring leads ready for conversion",
        };
      } else if (score >= 40) {
        segment = {
          segmentName: "Warm Leads",
          segmentColor: "#FFB946",
          description: "Leads with moderate potential requiring nurturing",
        };
      } else {
        segment = {
          segmentName: "Cold Leads",
          segmentColor: "#6C5CE7",
          description: "Early-stage leads needing engagement",
        };
      }
      
      segmentMap.set(lead.id, segment);
    }
    
    return segmentMap;
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
      model: "gpt-5-mini",
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
