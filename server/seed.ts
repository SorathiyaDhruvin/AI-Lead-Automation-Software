import { db } from "./db";
import { users, leads, segments } from "@shared/schema";
import { hashPassword } from "./auth";
import { eq } from "drizzle-orm";

export async function seedDatabase() {
  try {
    // Check if demo user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, "demo@leadflow.ai"));
    
    if (existingUser.length > 0) {
      console.log("Database already seeded");
      return;
    }

    console.log("Seeding database...");

    // Create demo user
    const hashedPassword = await hashPassword("demo1234");
    const [demoUser] = await db.insert(users).values({
      email: "demo@leadflow.ai",
      password: hashedPassword,
      name: "Demo User",
      role: "admin",
    }).returning();

    // Create segments
    const [hotLeadsSegment] = await db.insert(segments).values({
      userId: demoUser.id,
      name: "Hot Leads",
      description: "High-scoring leads ready for conversion",
      color: "#00D68F",
      leadCount: 0,
    }).returning();

    const [enterpriseSegment] = await db.insert(segments).values({
      userId: demoUser.id,
      name: "Enterprise Prospects",
      description: "Large company opportunities",
      color: "#0066FF",
      leadCount: 0,
    }).returning();

    const [nurtureSegment] = await db.insert(segments).values({
      userId: demoUser.id,
      name: "Nurture Required",
      description: "Leads needing follow-up and engagement",
      color: "#FFB946",
      leadCount: 0,
    }).returning();

    // Create sample leads
    const sampleLeads = [
      {
        userId: demoUser.id,
        name: "Sarah Chen",
        email: "sarah.chen@techcorp.com",
        company: "TechCorp Industries",
        phone: "+1 (555) 123-4567",
        source: "website" as const,
        status: "qualified" as const,
        aiScore: 87,
        aiPrediction: "High likelihood of conversion within 2 weeks",
        aiInsights: "Decision maker at enterprise company. Previous engagement shows strong interest in automation solutions.",
        segmentId: hotLeadsSegment.id,
        notes: "Met at SaaS conference. Very interested in our enterprise plan.",
      },
      {
        userId: demoUser.id,
        name: "Michael Rodriguez",
        email: "m.rodriguez@globalventures.io",
        company: "Global Ventures",
        phone: "+1 (555) 234-5678",
        source: "referral" as const,
        status: "proposal" as const,
        aiScore: 92,
        aiPrediction: "Excellent conversion probability - decision expected this month",
        aiInsights: "Referred by existing customer. Budget confirmed. Looking for Q1 implementation.",
        segmentId: hotLeadsSegment.id,
        notes: "Referred by James at Acme Corp. Looking for team of 50+ users.",
      },
      {
        userId: demoUser.id,
        name: "Emily Watson",
        email: "ewatson@innovatestart.co",
        company: "InnovateStart",
        phone: "+1 (555) 345-6789",
        source: "social" as const,
        status: "contacted" as const,
        aiScore: 65,
        aiPrediction: "Moderate interest - requires nurturing",
        aiInsights: "Early-stage startup with growth potential. Budget may be limited currently.",
        segmentId: nurtureSegment.id,
        notes: "Connected via LinkedIn. Interested but waiting for next funding round.",
      },
      {
        userId: demoUser.id,
        name: "David Kim",
        email: "david.kim@megaenterprises.com",
        company: "Mega Enterprises",
        phone: "+1 (555) 456-7890",
        source: "email" as const,
        status: "new" as const,
        aiScore: 78,
        aiPrediction: "Good potential - enterprise customer with large team",
        aiInsights: "Fortune 500 company. Multiple departments could benefit. Long sales cycle expected.",
        segmentId: enterpriseSegment.id,
        notes: "Responded to our newsletter. IT Director looking for automation tools.",
      },
      {
        userId: demoUser.id,
        name: "Jennifer Martinez",
        email: "jmartinez@rapidgrowth.io",
        company: "RapidGrowth Inc",
        phone: "+1 (555) 567-8901",
        source: "ads" as const,
        status: "qualified" as const,
        aiScore: 81,
        aiPrediction: "Strong buying signals - scheduling demo",
        aiInsights: "Fast-growing company looking to scale operations. Active comparison shopping.",
        segmentId: hotLeadsSegment.id,
        notes: "Clicked through from Google Ads. Requested pricing info.",
      },
      {
        userId: demoUser.id,
        name: "Robert Thompson",
        email: "r.thompson@startuplab.co",
        company: "Startup Lab",
        source: "event" as const,
        status: "contacted" as const,
        aiScore: 52,
        aiPrediction: "Early stage interest - needs education",
        aiInsights: "Small team, exploring options. Price-sensitive. Good long-term potential.",
        segmentId: nurtureSegment.id,
        notes: "Met at local tech meetup. Following up on demo request.",
      },
      {
        userId: demoUser.id,
        name: "Amanda Foster",
        email: "afoster@digitalsolutions.net",
        company: "Digital Solutions Co",
        phone: "+1 (555) 789-0123",
        source: "referral" as const,
        status: "negotiation" as const,
        aiScore: 94,
        aiPrediction: "Very high conversion probability - final stage",
        aiInsights: "Contract review in progress. Multiple stakeholders aligned. Expecting close this week.",
        segmentId: hotLeadsSegment.id,
        notes: "Referral from partner network. Legal reviewing contract.",
      },
    ];

    await db.insert(leads).values(sampleLeads);

    // Update segment lead counts
    await db.update(segments).set({ leadCount: 4 }).where(eq(segments.id, hotLeadsSegment.id));
    await db.update(segments).set({ leadCount: 1 }).where(eq(segments.id, enterpriseSegment.id));
    await db.update(segments).set({ leadCount: 2 }).where(eq(segments.id, nurtureSegment.id));

    console.log("Database seeded successfully!");
    console.log("Demo account: demo@leadflow.ai / demo1234");
  } catch (error) {
    console.error("Seed error:", error);
  }
}
