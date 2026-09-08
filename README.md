# Pile & Loop HR Management System (HROS)

The **Pile & Loop HR Management System** is a complete, production-ready internal Human Resources Operating System built for **Pile & Loop**. It replaces fragmented spreadsheets, manual candidate tracking, manual email copying, and isolated attendance sheets with a centralized, secure platform.

---

## Architecture & Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router v6, date-fns (PKT timezone `Asia/Karachi`), DOMPurify (XSS protection).
- **Backend**: Firebase Cloud Functions v2 (Node.js 20, TypeScript), Firebase Admin SDK.
- **Email Engine**: Server-side `imapflow` (scheduled IMAP synchronization every 5 minutes from cPanel) and `nodemailer` (idempotent SMTP sending).
- **AI Engine**: Google Gemini API via `@google/generative-ai` on Cloud Functions v2 with strict prompt injection defense and human-in-the-loop draft review.
- **Database & Storage**: Cloud Firestore (normalized collections & subcollections) and Firebase Cloud Storage (private bucket, default deny rules, temporary signed access).
- **Security & Authorization**: Firebase Authentication with Custom Claims (`role`: `SUPER_ADMIN`, `HR_SUPERVISOR`, `HR_EXECUTIVE`, `HR_INTERN`, `TEAM_MEMBER`), Firestore Security Rules (`firestore.rules`), Storage Security Rules (`storage.rules`).

---

## Role-Based Access Control (RBAC) Matrix

| Capability | SUPER_ADMIN | HR_SUPERVISOR | HR_EXECUTIVE | HR_INTERN | TEAM_MEMBER |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Full System & Role Management | ? | ? | ? | ? | ? |
| Manage Vacancies & Closeout Reports | ? | ? | ? | ? | ? |
| Final Selection / Rejection Decisions | ? | ? | ? | ? | ? |
| View Sensitive Documents (CNIC Front/Back) | ? | ? | ? | ? | ? |
| Complete Onboarding & Activate Interns | ? | ? | ? | ? | ? |
| Send Emails via cPanel SMTP | ? | ? | ? | Draft Only | ? |
| Review Screening & Schedule Interviews | ? | ? | ? | ? | ? |
| Check-in / Check-out (PKT Asia/Karachi) | ? | ? | ? | ? | ? (Own Only) |
| Timesheets & Daily Logs | ? | ? | ? | ? | ? (Own Only) |
| Attendance Manual Correction | ? | ? | ? | ? | ? |
| Submit Leave Requests | ? | ? | ? | ? | ? |
| Approve / Reject Leave Requests | ? | ? | ? | ? | ? |
| Offboarding & Certificate Eligibility | ? | ? | ? | ? | ? |
| View Audit Logs | ? | ? | ? | ? | ? |
| Access Recruitment CRM | ? | ? | ? | ? | ? (Denied) |

---

## Firestore Collection Schema

- `users/{uid}` - User profile & assigned roles.
- `vacancies/{vacancyId}` - Job openings, duration, core hours, screening questions.
- `candidates/{candidateId}` - Candidate personal record, normalized email and phone.
- `applications/{applicationId}` - Specific vacancy application, current stage, scores.
- `applications/{applicationId}/stageHistory/{historyId}` - Immutable stage audit trail.
- `emailThreads/{threadId}` - Mail conversation threads linked to candidates.
- `emailThreads/{threadId}/messages/{messageId}` - Individual inbound/outbound emails.
- `emailTemplates/{templateId}` - Reusable templates with dynamic variable interpolation.
- `interviews/{interviewId}` - Scheduled interviews, scorecards, meeting links.
- `onboardingCases/{onboardingId}` - Document verification (CNIC, speed tests, etc.) & access checklist.
- `people/{personId}` - Active interns, employees, alumni records.
- `attendance/{attendanceId}` - Server-timestamp PKT check-in/out records and breaks.
- `leaveRequests/{requestId}` - Leave requests, allowance tracking, supervisor approvals.
- `dailyLogs/{logId}` - Daily deliverables and time spent.
- `weeklyReports/{reportId}` - Weekly reports with supervisor feedback.
- `workTasks/{taskId}` - Internal HR coordination tasks.
- `performanceReviews/{reviewId}` - Formal evaluations and developmental action plans.
- `offboardingCases/{offboardingId}` - Access revocation, files return, certificate status.
- `auditLogs/{auditId}` - Immutable administrative and security audit events.
- `notifications/{notificationId}` - In-app operational notifications.
- `systemSettings/general` - Configured policies, booking URL, follow-up intervals.
- `mailSyncState/hr_mailbox` - IMAP UIDVALIDITY and sync progress.
- `duplicateReview/{reviewId}` - Uncertain duplicate candidate queue.

---

## Cloud Functions v2 Reference

- `bootstrapSuperAdmin`: Designates the initial Super Admin account.
- `createInternalUser`: Provisions new HR or team accounts with custom claims.
- `updateUserRole`: Modifies user custom claims and profile role.
- `disableInternalUser`: Suspends internal user login access.
- `sendHrEmail`: Sends email via cPanel SMTP with idempotency and audit tracking.
- `syncHrMailbox`: Synchronizes incoming candidate emails from cPanel IMAP.
- `scheduledHrMailboxSync`: Cron job running every 5 minutes for mail sync.
- `generateHrEmailDraft`: Gemini AI drafting assistant with prompt injection defense.
- `summarizeEmailThread`: Gemini AI extraction of inquiry, commitments, and next steps.
- `importCandidateCsv`: 5-step legacy spreadsheet parser and batch deduplicator.
- `reviewDuplicateCandidate`: Resolves uncertain duplicates (Merge, Keep Separate, Ignore).
- `transitionApplicationStage`: Manages recruitment stages with audit history.
- `closeVacancy`: Generates comprehensive vacancy closeout report and outcomes.
- `checkIn`: Records server-timestamp check-in in PKT timezone (single active session).
- `startBreak` / `endBreak`: Tracks break duration.
- `checkOut`: Calculates net worked minutes and checkout summary.
- `correctAttendance`: Supervisor manual adjustment with mandatory reason and audit entry.
- `createOnboardingCase`: Initializes document verification checklists.
- `updateDocumentStatus`: Reviews watermark, validity, and status of candidate documents.
- `completeOnboarding`: Atomic transaction converting candidate to active intern.
- `createOffboardingCase` / `completeOffboarding`: Finalizes exit checklists and certificate issuance.
- `scheduledInternshipEndAlerts`: Daily alerts at 30, 14, 7, and 1 day before end date.
- `scheduledHrAlerts`: Follow-up reminders (maximum 2 follow-ups policy).

---

## Secret Manager & Environment Configuration

The following credentials must be set in **Google Cloud Secret Manager** or configured as environment secrets for Cloud Functions:

```bash
# cPanel IMAP Mailbox (Receiving)
HR_IMAP_HOST="mail.pileandloop.com"
HR_IMAP_PORT="993"
HR_IMAP_SECURE="true"

# cPanel SMTP Mailbox (Sending)
HR_SMTP_HOST="mail.pileandloop.com"
HR_SMTP_PORT="465"
HR_SMTP_SECURE="true"

# Mailbox Credentials
HR_EMAIL_USER="hr@pileandloop.com"
HR_EMAIL_PASSWORD="<YOUR_CPANEL_PASSWORD>"

# Google Gemini API
GEMINI_API_KEY="<YOUR_GEMINI_API_KEY>"

# Bootstrap Secret (Optional override for initial setup)
BOOTSTRAP_SECRET="pileandloop-hros-bootstrap-2026"
```

> **Security Notice**: Never commit credentials to Git or expose them in browser source code or network payloads.

---

## Local Development & Emulators

### Prerequisites
- Node.js LTS (v20+)
- Git
- Firebase CLI (`npm install -g firebase-tools` or `npx firebase-tools`)

### Setup Commands
```bash
# 1. Install frontend dependencies
npm install

# 2. Install Cloud Functions dependencies
npm --prefix functions install

# 3. Build Cloud Functions
npm --prefix functions run build

# 4. Start local development server
npm run dev

# 5. (Optional) Run Firebase Emulators
npx firebase-tools emulators:start
```

---

## Deployment Instructions

Deploying frontend to Firebase Hosting and backend to Cloud Functions v2:

```bash
# 1. Build frontend bundle
npm run build

# 2. Build Cloud Functions TypeScript
npm --prefix functions run build

# 3. Deploy to Firebase
npx firebase-tools deploy
```

---

## Initial Super Admin Bootstrap

1. Open the deployed application (or local `http://localhost:5173/login`).
2. Click **"First-time Initial Admin Bootstrap?"**.
3. Enter your primary administrator email (`hr@pileandloop.com` or designated admin).
4. Click **"Bootstrap Super Admin"**.
5. Once complete, sign in with your email and password to access the full HR Operating System.

---

## Legacy Spreadsheet CSV Migration

1. Navigate to **Recruitment -> Import CSV** (`/recruitment/import`).
2. Upload the exported candidate tracker spreadsheet.
3. Review row parsing and field mappings.
4. Run the **Dry-Run Analysis** to verify candidate counts, duplicate flags, and warnings without writing to the database.
5. Click **"Confirm & Execute Batch Import"** to commit records safely in batches.
6. Check the **Duplicate Review Queue** (`/recruitment/duplicates`) for any uncertain duplicates requiring human decision.
