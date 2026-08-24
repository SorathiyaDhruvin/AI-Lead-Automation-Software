// Pure TypeScript interfaces — no Drizzle dependency.
// These mirror the shapes returned by the Express + PostgreSQL backend.

export interface UserLegacy {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  phone?: string | null;
  dob?: string | null;
  gender?: string | null;
  language?: string | null;
  occupation?: string | null;
  company?: string | null;
  department?: string | null;
  bio?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  postalCode?: string | null;
  streetAddress?: string | null;
  linkedin?: string | null;
  github?: string | null;
  portfolio?: string | null;
  twitter?: string | null;
  website?: string | null;
  profileImageUrl?: string | null;
  role: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface Lead {
  id: string;
  userId: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  source: string;
  status: string;
  aiScore: number | null;
  aiCategory: string | null;
  aiPrediction: string | null;
  aiInsights: string | null;
  aiRecommendedAction: string | null;
  aiRating: string | null;
  aiReason: string | null;
  aiStrengths: any | null;
  aiWeaknesses: any | null;
  aiRecommendation: string | null;
  segmentId: string | null;
  notes: string | null;
  lastContact: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Segment {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  criteria: string | null;
  color: string;
  leadCount: number;
  createdAt: string;
}

export interface Activity {
  id: string;
  leadId: string;
  userId: string;
  type: string;
  description: string;
  createdAt: string;
}

export interface LeadNote {
  id: string;
  leadId: string;
  userId: string;
  text: string;
  createdAt: string;
  authorName?: string;
}

export interface LeadRequest {
  id: string;
  userId: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  industry: string | null;
  budget: string | null;
  description: string;
  priority: string;
  status: string;
  adminNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRule {
  id: string;
  userId: string;
  name: string;
  triggerType: string;
  triggerValue: number;
  actionType: string;
  actionValue: string;
  isActive: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface DailyTrend {
  date: string;
  count: number;
}

export interface DashboardStats {
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  segments: number;
  avgScore: number;
  conversionRate: number;
  statusCounts: Record<string, number>;
  dailyTrend: DailyTrend[];
  leadsTrend: number;
  scoreTrend: number;
  automationExecutions: number;
  automationSuccessful: number;
  automationFailed: number;
  automationSuccessRate: number;
  emailsSent: number;
  emailsFailed: number;
}

export interface LeadFilters {
  search?: string;
  status?: string;
  minScore?: number;
  maxScore?: number;
  dateFrom?: string;
  dateTo?: string;
}

// ── NEW: Workflow types (DB-backed) ──

export interface WorkflowCondition {
  type: string;
  value: string | number;
  operator?: string;
}

export interface WorkflowAction {
  id?: string;
  type: string;
  name: string;
  value?: string;
  config?: Record<string, any>;
}

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  lead_id: string;
  user_id: string;
  trigger_event: string;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  actions_completed: number;
  total_actions: number;
  error: string | null;
  started_at: string;
  completed_at: string | null;
  idempotency_key: string;
  created_at: string;
  // Joined fields
  workflow_name?: string;
  lead_name?: string;
  lead_email?: string;
}

export interface ExecutionStats {
  total: number;
  successful: number;
  failed: number;
  running: number;
  skipped: number;
  successRate: number;
  totalWorkflows: number;
  activeWorkflows: number;
}

export interface EmailTemplate {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  body_html: string;
  variables: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailLog {
  id: string;
  lead_id: string | null;
  user_id: string | null;
  recipient: string;
  subject: string | null;
  template_id: string | null;
  workflow_execution_id: string | null;
  provider: string;
  status: "pending" | "sent" | "failed" | "bounced" | "delivered";
  provider_message_id: string | null;
  error: string | null;
  sent_at: string;
  template_name?: string;
}

export interface UserSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  leadAlerts: boolean;
  automationAlerts: boolean;
  dailyDigest: boolean;
  automationEnabled: boolean;
  theme: string;
  timezone: string;
}
