import {UserType, SubscriptionTier} from '../config';

export interface User {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  user_type: UserType;
  active: boolean;
  profile_picture?: string;
  languages?: string[];
  city?: string;
  state?: string;
  bar_council_id?: string;
  specializations?: string[];
  experience_years?: number;
  bio?: string;
  created_at?: string;
}

export interface Case {
  id: string;
  case_number?: string;
  title?: string;
  description?: string;
  status: string;
  case_type?: string;
  first_party?: User;
  second_party?: User;
  mediator?: User;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
  next_meeting?: CalendarEvent;
  progress_phase?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  description?: string;
  case_id?: string;
  location?: string;
  meeting_link?: string;
  attendees?: string[];
  status?: string;
  feedback?: EventFeedback;
}

export interface EventFeedback {
  id?: string;
  rating?: number;
  notes?: string;
  submitted_at?: string;
}

export interface Invoice {
  id: string;
  invoice_number?: string;
  amount: number;
  status: string;
  due_date?: string;
  paid_at?: string;
  case_id?: string;
  mediator_id?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  gateway?: string;
  created_at: string;
  reference_id?: string;
}

export interface Blog {
  id: string;
  title: string;
  content?: string;
  excerpt?: string;
  thumbnail?: string;
  status: string;
  author?: User;
  categories?: BlogCategory[];
  tags?: BlogTag[];
  created_at: string;
  updated_at?: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug?: string;
}

export interface BlogTag {
  id: string;
  name: string;
  slug?: string;
}

export interface VideoReel {
  id: string;
  title: string;
  video_url: string;
  thumbnail?: string;
  description?: string;
  status: string;
  created_at: string;
}

export interface Reward {
  id: string;
  name: string;
  description?: string;
  points_required: number;
  image?: string;
  category?: string;
  available?: boolean;
}

export interface RewardOrder {
  id: string;
  reward: Reward;
  status: string;
  redeemed_at: string;
  fulfilled_at?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

export interface CorrespondenceMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_name?: string;
  sender_type?: UserType;
  case_id?: string;
  created_at: string;
  attachments?: string[];
}

export interface SupportThread {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  last_message?: string;
  messages?: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  content: string;
  sender_type: 'user' | 'admin';
  created_at: string;
}

export interface DashboardContent {
  activeCases?: Case[];
  upcomingMeetings?: CalendarEvent[];
  recentActivity?: ActivityItem[];
  stats?: DashboardStats;
  pendingActions?: PendingAction[];
}

export interface DashboardStats {
  totalCases?: number;
  activeCases?: number;
  resolvedCases?: number;
  pendingPayments?: number;
  rewardPoints?: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  case_id?: string;
}

export interface PendingAction {
  id: string;
  type: string;
  title: string;
  description?: string;
  case_id?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
  };
}

export interface PaymentConfig {
  gateway: string;
  key?: string;
  environment?: string;
}

export interface PrivateInvoice {
  id: string;
  invoice_number: string;
  client_name: string;
  amount: number;
  status: string;
  due_date?: string;
  items?: PrivateInvoiceItem[];
  created_at: string;
}

export interface PrivateInvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface CourtCase {
  id: string;
  cnr: string;
  label?: string;
  status?: string;
  court?: string;
  next_hearing?: string;
  last_refreshed?: string;
}

export interface MediatorSubscription {
  tier: SubscriptionTier;
  features: string[];
}

export interface AdminSettings {
  commission_rate?: number;
  payment_gateway?: string;
  support_email?: string;
  [key: string]: unknown;
}

export interface BankAccount {
  account_holder: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  branch?: string;
}
