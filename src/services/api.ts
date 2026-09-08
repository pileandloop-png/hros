import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export async function bootstrapSuperAdmin(email: string, bootstrapSecret?: string) {
  const fn = httpsCallable(functions, 'bootstrapSuperAdmin');
  const res = await fn({ email, bootstrapSecret });
  return res.data;
}

export async function createInternalUser(data: {
  email: string;
  password: string;
  displayName: string;
  role: string;
  department?: string;
  jobTitle?: string;
}) {
  const fn = httpsCallable(functions, 'createInternalUser');
  const res = await fn(data);
  return res.data;
}

export async function updateUserRole(targetUid: string, newRole: string) {
  const fn = httpsCallable(functions, 'updateUserRole');
  const res = await fn({ targetUid, newRole });
  return res.data;
}

export async function disableInternalUser(targetUid: string, disabled: boolean) {
  const fn = httpsCallable(functions, 'disableInternalUser');
  const res = await fn({ targetUid, disabled });
  return res.data;
}

export async function sendHrEmail(data: {
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  textBody?: string;
  htmlBody: string;
  threadId?: string;
  candidateId?: string;
  applicationId?: string;
  category?: string;
  idempotencyKey: string;
}) {
  const fn = httpsCallable(functions, 'sendHrEmail');
  const res = await fn(data);
  return res.data as { success: boolean; threadId: string; messageId: string; sentAt: string };
}

export async function syncHrMailbox() {
  const fn = httpsCallable(functions, 'syncHrMailbox');
  const res = await fn();
  return res.data as { success: boolean; newMessagesCount: number; syncErrors: string[] };
}

export async function generateHrEmailDraft(data: {
  candidateId?: string;
  applicationId?: string;
  threadId?: string;
  userInstruction: string;
  draftType?: string;
}) {
  const fn = httpsCallable(functions, 'generateHrEmailDraft');
  const res = await fn(data);
  return res.data as { success: boolean; draft: any; generationId: string };
}

export async function summarizeEmailThread(threadId: string) {
  const fn = httpsCallable(functions, 'summarizeEmailThread');
  const res = await fn({ threadId });
  return res.data as { success: boolean; summary: any };
}

export async function importCandidateCsv(rows: any[], isDryRun: boolean, defaultVacancyId?: string) {
  const fn = httpsCallable(functions, 'importCandidateCsv');
  const res = await fn({ rows, isDryRun, defaultVacancyId });
  return res.data as { success: boolean; isDryRun: boolean; result: any };
}

export async function reviewDuplicateCandidate(reviewId: string, action: 'MERGE' | 'KEEP_SEPARATE' | 'IGNORE', targetCandidateId?: string) {
  const fn = httpsCallable(functions, 'reviewDuplicateCandidate');
  const res = await fn({ reviewId, action, targetCandidateId });
  return res.data;
}

export async function transitionApplicationStage(applicationId: string, newStage: string, reason?: string) {
  const fn = httpsCallable(functions, 'transitionApplicationStage');
  const res = await fn({ applicationId, newStage, reason });
  return res.data as { success: boolean; oldStage: string; newStage: string };
}

export async function closeVacancy(vacancyId: string) {
  const fn = httpsCallable(functions, 'closeVacancy');
  const res = await fn({ vacancyId });
  return res.data as { success: boolean; closeoutReport: any };
}

export async function checkIn(plannedTasks?: string) {
  const fn = httpsCallable(functions, 'checkIn');
  const res = await fn({ plannedTasks });
  return res.data as { success: boolean; attendanceId: string; dateKey: string };
}

export async function startBreak() {
  const fn = httpsCallable(functions, 'startBreak');
  const res = await fn();
  return res.data as { success: boolean; status: string };
}

export async function endBreak() {
  const fn = httpsCallable(functions, 'endBreak');
  const res = await fn();
  return res.data as { success: boolean; status: string; totalBreakMinutes: number };
}

export async function checkOut(data: {
  tasksCompleted?: string;
  blockers?: string;
  nextDayPlans?: string;
  notes?: string;
}) {
  const fn = httpsCallable(functions, 'checkOut');
  const res = await fn(data);
  return res.data as { success: boolean; totalWorkedMinutes: number; netWorkedMinutes: number; breakMinutes: number };
}

export async function correctAttendance(attendanceId: string, newNetWorkedMinutes: number, newStatus: string | undefined, reason: string) {
  const fn = httpsCallable(functions, 'correctAttendance');
  const res = await fn({ attendanceId, newNetWorkedMinutes, newStatus, reason });
  return res.data;
}

export async function createOnboardingCase(data: {
  applicationId: string;
  candidateId: string;
  startDate?: string;
  durationMonths?: number;
  department?: string;
  role?: string;
  supervisorId?: string;
}) {
  const fn = httpsCallable(functions, 'createOnboardingCase');
  const res = await fn(data);
  return res.data as { success: boolean; onboardingId: string };
}

export async function updateDocumentStatus(data: {
  onboardingId: string;
  documentType: string;
  status: string;
  watermarkStatus?: string;
  notes?: string;
  storagePath?: string;
}) {
  const fn = httpsCallable(functions, 'updateDocumentStatus');
  const res = await fn(data);
  return res.data;
}

export async function completeOnboarding(onboardingId: string) {
  const fn = httpsCallable(functions, 'completeOnboarding');
  const res = await fn({ onboardingId });
  return res.data as { success: boolean; personId: string; message: string };
}

export async function createOffboardingCase(data: {
  personId: string;
  reason: string;
  offboardingType: string;
  lastWorkingDate?: string;
}) {
  const fn = httpsCallable(functions, 'createOffboardingCase');
  const res = await fn(data);
  return res.data as { success: boolean; offboardingId: string };
}

export async function completeOffboarding(data: {
  offboardingId: string;
  certificateStatus: string;
  recommendationLetterStatus: string;
  finalNotes?: string;
}) {
  const fn = httpsCallable(functions, 'completeOffboarding');
  const res = await fn(data);
  return res.data;
}