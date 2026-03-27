export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  service: string;
  status: 'new' | 'contacted' | 'qualified' | 'booked' | 'completed';
  urgency: 'routine' | 'urgent' | 'emergency';
  source: 'inbound_call' | 'missed_call' | 'website' | 'referral';
  createdAt: string;
  lastContactAt: string;
  notes?: string;
}

export interface TranscriptMessage {
  role: 'ai' | 'customer';
  content: string;
  timestamp: string;
}

export interface Call {
  id: string;
  contactName: string;
  phone: string;
  duration: number;
  status: 'completed' | 'missed' | 'in-progress';
  type: 'inbound' | 'outbound';
  summary?: string;
  transcript: TranscriptMessage[];
  recordingUrl?: string;
  stereoRecordingUrl?: string;
  cost?: number;
  success?: boolean;
  createdAt: string;
  endedAt?: string;
}

export interface DashboardStats {
  totalCalls: number;
  totalCallsTrend: number;
  bookingsMade: number;
  bookingsTrend: number;
  missedCallsRecovered: number;
  missedCallsTrend: number;
  revenueImpact: number;
  revenueTrend: number;
}

export interface PipelineStage {
  id: string;
  title: string;
  contacts: Contact[];
}
