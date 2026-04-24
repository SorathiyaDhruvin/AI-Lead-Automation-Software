import cron from "node-cron";
import { storage } from "./storage";
import { sendEmail, buildFollowUpEmail } from "./email-service";

export function startCronJobs(): void {
  // Runs every hour: evaluate active automation rules against all leads
  cron.schedule("0 * * * *", async () => {
    console.log("[cron] Running automation rules evaluation...");
    try {
      await evaluateRules();
    } catch (err) {
      console.error("[cron] Rule evaluation failed:", err);
    }
  });

  console.log("[cron] Automation cron jobs started");
}

async function evaluateRules(): Promise<void> {
  const rules = await storage.getActiveAutomationRules();

  for (const rule of rules) {
    try {
      const leads = await storage.getLeadsByUser(rule.userId);

      for (const lead of leads) {
        let conditionMet = false;

        if (rule.triggerType === "score_threshold") {
          conditionMet = (lead.aiScore ?? 0) >= rule.triggerValue;
        } else if (rule.triggerType === "no_contact_hours") {
          if (lead.lastContact) {
            const hoursSince =
              (Date.now() - new Date(lead.lastContact).getTime()) / (1000 * 60 * 60);
            conditionMet = hoursSince >= rule.triggerValue;
          } else {
            const hoursSince =
              (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60);
            conditionMet = hoursSince >= rule.triggerValue;
          }
        }

        if (!conditionMet) continue;

        if (rule.actionType === "set_priority") {
          await storage.updateLead(lead.id, { status: rule.actionValue });
          await storage.createActivity({
            leadId: lead.id,
            userId: rule.userId,
            type: "status_changed",
            description: `Automation rule "${rule.name}" set status to "${rule.actionValue}"`,
          });
        } else if (rule.actionType === "send_email") {
          await sendEmail(
            lead.email,
            rule.actionValue,
            buildFollowUpEmail(lead.name, rule.actionValue)
          );
          await storage.createActivity({
            leadId: lead.id,
            userId: rule.userId,
            type: "email",
            description: `Automation rule "${rule.name}" sent email: ${rule.actionValue}`,
          });
        }
      }
    } catch (err) {
      console.error(`[cron] Error processing rule ${rule.id}:`, err);
    }
  }
}
