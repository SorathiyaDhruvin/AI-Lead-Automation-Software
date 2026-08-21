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
  segments: number;
  avgScore: number;
  conversionRate: number;
  statusCounts: Record<string, number>;
  dailyTrend: DailyTrend[];
  leadsTrend: number;
  scoreTrend: number;
}

export interface LeadFilters {
  search?: string;
  status?: string;
  minScore?: number;
  maxScore?: number;
  dateFrom?: string;
  dateTo?: string;
}
