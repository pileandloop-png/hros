// Cloud Functions v2 Entry Point for Pile & Loop HROS

export {
  bootstrapSuperAdmin,
  createInternalUser,
  updateUserRole,
  disableInternalUser
} from './auth/roles';

export {
  sendHrEmail
} from './email/smtp';

export {
  syncHrMailbox,
  scheduledHrMailboxSync
} from './email/imap';

export {
  generateHrEmailDraft,
  summarizeEmailThread
} from './ai/gemini';

export {
  importCandidateCsv,
  reviewDuplicateCandidate
} from './recruitment/csvImport';

export {
  transitionApplicationStage,
  closeVacancy
} from './recruitment/pipeline';

export {
  checkIn,
  startBreak,
  endBreak,
  checkOut,
  correctAttendance
} from './attendance/timeTracking';

export {
  createOnboardingCase,
  updateDocumentStatus,
  completeOnboarding
} from './onboarding/workflow';

export {
  createOffboardingCase,
  completeOffboarding
} from './offboarding/workflow';

export {
  scheduledInternshipEndAlerts,
  scheduledHrAlerts
} from './scheduled/alerts';