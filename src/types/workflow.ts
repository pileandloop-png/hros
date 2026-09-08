export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequest {
  requestId: string;
  userId: string;
  userName?: string;
  leaveType: 'SICK' | 'CASUAL' | 'EXAM' | 'EMERGENCY' | 'OTHER';
  startDate: string;
  endDate: string;
  requestedDays: number;
  reason: string;
  status: LeaveStatus;
  submittedAt: any;
  reviewedBy?: string;
  reviewedAt?: any;
  reviewNotes?: string;
}

export interface WorkTask {
  taskId: string;
  title: string;
  description: string;
  type: string;
  candidateId?: string;
  applicationId?: string;
  onboardingId?: string;
  assignedTo: string;
  assignedByName?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'AWAITING_RESPONSE' | 'DONE' | 'CANCELLED';
  dueAt?: any;
  completedAt?: any;
  createdAt: any;
  updatedAt: any;
}

export interface DailyLog {
  logId: string;
  userId: string;
  dateKey: string;
  tasks: string;
  timeSpentMinutes: number;
  status: string;
  deliverableLinks?: string;
  notes?: string;
  supervisorFeedback?: string;
  createdAt: any;
}

export interface WeeklyReport {
  reportId: string;
  userId: string;
  userName: string;
  weekBeginning: string;
  weekEnding: string;
  tasksCompleted: string;
  deliverableLinks?: string;
  challengesEncountered?: string;
  howChallengesHandled?: string;
  prioritiesNextWeek?: string;
  status: 'SUBMITTED' | 'REVIEWED' | 'LATE';
  supervisorFeedback?: string;
  submittedAt: any;
  reviewedAt?: any;
}

export interface PerformanceReview {
  reviewId: string;
  personId: string;
  personName: string;
  periodStart: string;
  periodEnd: string;
  reviewerId: string;
  reviewerName: string;
  taskQuality: number; // 1-5
  timeliness: number; // 1-5
  communication: number; // 1-5
  attendance: number; // 1-5
  initiative: number; // 1-5
  professionalism: number; // 1-5
  strengths: string;
  improvementAreas: string;
  actionPlan: string;
  overallRating: number; // 1-5
  privateNotes?: string;
  isSharedWithEmployee: boolean;
  createdAt: any;
}

export interface OffboardingCase {
  offboardingId: string;
  personId: string;
  reason: string;
  noticeDate: any;
  lastWorkingDate: any;
  offboardingType: 'INTERNSHIP_COMPLETED' | 'EARLY_EXIT' | 'RESIGNATION' | 'TERMINATION' | 'OTHER';
  status: 'IN_PROGRESS' | 'COMPLETED';
  accessRevocationChecklist: { key: string; label: string; completed: boolean }[];
  documentReturnChecklist: { key: string; label: string; completed: boolean }[];
  completionEligibility: {
    isEligibleForCertificate: boolean;
    eligibilityReason: string;
    certificateIssued: boolean;
    recommendationLetterIssued: boolean;
  };
  finalNotes?: string;
  completedBy?: string;
  completedAt?: any;
  createdAt: any;
  updatedAt: any;
}

export interface AuditLogEntry {
  auditId: string;
  actorUid: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: any;
  after?: any;
  metadata?: Record<string, any>;
  createdAt: any;
}

export interface AppNotification {
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType: string;
  entityId: string;
  read: boolean;
  createdAt: any;
}