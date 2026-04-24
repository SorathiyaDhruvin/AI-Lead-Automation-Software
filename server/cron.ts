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

const DEFAULT_COOLDOWN_HOURS = 24;

async function hasRecentRuleActivity(leadId: string, ruleId: string, cooldownHours: number): Promise<boolean> {
  const activities = await storage.getActivitiesByLead(leadId);
  const cutoff = Date.now() - cooldownHours * 60 * 60 * 1000;
  const marker = `[rule:${ruleId}]`;
  return activities.some(
    (a) => a.description.includes(marker) && new Date(a.createdAt).getTime() > cutoff
  );
}

async function evaluateRules(): Promise<void> {
  const rules = await storage.getActiveAutomationRules();

  for (const rule of rules) {
    try {
      const leads = await storage.getLeadsByUser(rule.userId);

      for (const lead of leads) {
        let conditionMet = false;

        if (rule.triggerType === "score_threshold") {
          const triggerValue = Number(rule.triggerValue);
          if (!isNaN(triggerValue)) {
            conditionMet = (lead.aiScore ?? 0) >= triggerValue;
          }
        } else if (rule.triggerType === "no_contact_hours") {
          const triggerValue = Number(rule.triggerValue);
          if (!isNaN(triggerValue)) {
            const referenceDate = lead.lastContact ?? lead.createdAt;
            const hoursSince = (Date.now() - new Date(referenceDate).getTime()) / (1000 * 60 * 60);
            conditionMet = hoursSince >= triggerValue;
          }
        }

        if (!conditionMet) continue;

        // Deduplication: skip if this rule already fired for this lead within cooldown window.
        // For no_contact_hours rules, use triggerValue as cooldown so the rule doesn't re-fire
        // until that many hours of no-contact have elapsed again after the last action.
        const cooldownHours =
          rule.triggerType === "no_contact_hours"
            ? Number(rule.triggerValue) || DEFAULT_COOLDOWN_HOURS
            : DEFAULT_COOLDOWN_HOURS;
        const alreadyFired = await hasRecentRuleActivity(lead.id, rule.id, cooldownHours);
        if (alreadyFired) continue;

        if (rule.actionType === "set_status") {
          await storage.updateLead(lead.id, { status: rule.actionValue });
          await storage.createActivity({
            leadId: lead.id,
            userId: rule.userId,
            type: "status_changed",
            description: `[rule:${rule.id}] Automation rule "${rule.name}" set status to "${rule.actionValue}"`,
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
            description: `[rule:${rule.id}] Automation rule "${rule.name}" sent email: ${rule.actionValue}`,
          });
        }
      }
    } catch (err) {
      console.error(`[cron] Error processing rule ${rule.id}:`, err);
    }
  }
}
