export type DocumentType = 
  | 'CNIC_FRONT'
  | 'CNIC_BACK'
  | 'TRANSCRIPT'
  | 'SPEED_TEST'
  | 'DEVICE_SPECS'
  | 'AGREEMENT'
  | 'PORTFOLIO'
  | 'OTHER';

export type DocumentStatus = 
  | 'NOT_REQUIRED'
  | 'MISSING'
  | 'RECEIVED'
  | 'UNDER_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'REUPLOAD_REQUIRED';

export type WatermarkStatus = 'UNKNOWN' | 'VERIFIED' | 'MISSING' | 'INVALID';

export interface DocumentChecklistItem {
  type: DocumentType;
  name: string;
  status: DocumentStatus;
  watermarkStatus?: WatermarkStatus;
  storagePath?: string;
  isSensitive: boolean;
  required: boolean;
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface AccessChecklistItem {
  key: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface OnboardingCase {
  onboardingId: string;
  applicationId: string;
  candidateId: string;
  vacancyId?: string;
  userUid?: string;
  startDate: any;
  expectedEndDate: any;
  department: string;
  role: string;
  supervisorId: string;
  status: 'DOCUMENTS_PENDING' | 'UNDER_REVIEW' | 'COMPLETED' | 'STALLED';
  documentChecklist: DocumentChecklistItem[];
  accessChecklist: AccessChecklistItem[];
  notes?: string;
  completedAt?: any;
  completedBy?: string;
  createdAt?: any;
  updatedAt?: any;
}