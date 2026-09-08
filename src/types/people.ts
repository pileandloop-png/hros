export type WorkerType = 'INTERN' | 'EMPLOYEE' | 'CONTRACTOR' | 'OTHER';
export type PeopleStatus = 'ONBOARDING' | 'ACTIVE' | 'ON_LEAVE' | 'COMPLETED' | 'RESIGNED' | 'TERMINATED' | 'OFFBOARDED';

export interface PeopleRecord {
  personId: string;
  candidateId?: string;
  applicationId?: string;
  userUid?: string;
  fullName: string;
  personalEmail: string;
  companyEmail?: string;
  phone: string;
  department: string;
  jobTitle: string;
  workerType: WorkerType;
  managerId: string;
  joiningDate: any;
  expectedEndDate?: any;
  actualEndDate?: any;
  status: PeopleStatus;
  workingDays: string[];
  expectedHoursPerDay: number;
  coreHours: string;
  leaveAllowanceDaysPerMonth: number;
  profilePhoto?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  onboardingId?: string;
  offboardingId?: string;
  createdAt: any;
  updatedAt: any;
}

export interface AttendanceRecord {
  attendanceId: string;
  userId: string;
  userName: string;
  dateKey: string; // YYYY-MM-DD PKT
  checkInAt: any;
  checkOutAt?: any;
  status: 'CHECKED_IN' | 'ON_BREAK' | 'CHECKED_OUT';
  plannedTasks?: string;
  tasksCompleted?: string;
  blockers?: string;
  nextDayPlans?: string;
  notes?: string;
  workedMinutes: number;
  breakMinutes: number;
  netWorkedMinutes: number;
  breaks: { startAt: any; endAt: any; durationMinutes?: number }[];
  isCorrected?: boolean;
  correctionReason?: string;
  correctedBy?: string;
  createdAt: any;
  updatedAt: any;
}