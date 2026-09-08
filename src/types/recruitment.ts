export type VacancyStatus = 'DRAFT' | 'OPEN' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';

export interface ScreeningQuestion {
  id: string;
  question: string;
  expectedResponseType?: 'text' | 'yes_no' | 'link';
  required?: boolean;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  competency?: string;
}

export interface Vacancy {
  vacancyId: string;
  title: string;
  department: string;
  type: string;
  employmentType: string;
  internshipDurationMonths: number;
  expectedHoursPerDay: number;
  workingDays: string[];
  coreHours: string;
  locationType: 'REMOTE' | 'HYBRID' | 'ONSITE';
  description: string;
  requirements: string[];
  screeningQuestions?: ScreeningQuestion[];
  interviewQuestions?: InterviewQuestion[];
  status: VacancyStatus;
  openDate?: any;
  closeDate?: any;
  applicationDeadline?: string;
  createdBy: string;
  assignedHRUsers?: string[];
  applicationCount?: number;
  selectedCount?: number;
  onboardedCount?: number;
  closeoutReport?: any;
  createdAt?: any;
  updatedAt?: any;
}

export interface Candidate {
  candidateId: string;
  fullName: string;
  personalEmail: string;
  normalizedEmail: string;
  phone: string;
  normalizedPhone: string;
  city: string;
  education?: string;
  candidateTags?: string[];
  cvLink?: string;
  rawLegacyData?: Record<string, any>;
  createdAt?: any;
  updatedAt?: any;
}

export type ApplicationStage = 
  | 'NEW_APPLICATION'
  | 'INITIAL_REVIEW'
  | 'INITIAL_EMAIL_SENT'
  | 'REPLY_PENDING'
  | 'SCREENING_QUESTIONS_SENT'
  | 'SCREENING_RESPONSE_RECEIVED'
  | 'SCREENING_REVIEW'
  | 'INTERVIEW_INVITED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_COMPLETED'
  | 'DECISION_PENDING'
  | 'SELECTED'
  | 'OFFER_SENT'
  | 'OFFER_ACCEPTED'
  | 'ONBOARDING_DOCUMENTS_PENDING'
  | 'DOCUMENTS_UNDER_REVIEW'
  | 'ONBOARDING_APPROVED'
  | 'ONBOARDED'
  | 'ACTIVE_INTERN'
  | 'COMPLETED'
  | 'OFFBOARDED'
  | 'NOT_HIRED'
  | 'WITHDRAWN'
  | 'INTERVIEW_NO_SHOW'
  | 'APPLICATION_CLOSED'
  | 'DISQUALIFIED';

export interface StageHistoryEntry {
  historyId: string;
  stage: ApplicationStage;
  changedFrom: ApplicationStage | null;
  changedBy: string;
  reason?: string;
  changedAt: any;
}

export interface Application {
  applicationId: string;
  legacyApplicationId?: string;
  candidateId: string;
  vacancyId: string;
  positionAppliedFor: string;
  applicationDate?: any;
  source: string;
  assignedHRUserIds?: string[];
  currentStage: ApplicationStage;
  keyCandidateFactor?: string;
  hrNotes?: string;
  ownerNotes?: string;
  cvDocumentId?: string | null;
  screeningScore?: number;
  interviewScore?: number;
  decision?: string;
  followUpStatus?: string;
  firstEmailSentBy?: string;
  followUp1SentOn?: string;
  followUp2SentOn?: string;
  initialEmailSentAt?: any;
  lastCandidateReplyAt?: any;
  nextFollowUpDueAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

export interface InterviewRecord {
  interviewId: string;
  applicationId: string;
  candidateId: string;
  vacancyId?: string;
  scheduledDate: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  meetingPlatform: string;
  meetingLink?: string;
  bookingReference?: string;
  interviewerIds: string[];
  status: 'INVITED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED' | 'NO_SHOW';
  notes?: string;
  scorecard?: Record<string, number>;
  decisionRecommendation?: string;
  createdAt?: any;
  updatedAt?: any;
}