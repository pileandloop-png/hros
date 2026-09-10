import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import { ToastProvider } from './contexts/ToastContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { Login } from './components/auth/Login';
import { Dashboard } from './components/dashboard/Dashboard';
import { VacanciesList } from './components/recruitment/VacanciesList';
import { ApplicationsTable } from './components/recruitment/ApplicationsTable';
import { CandidateProfile } from './components/recruitment/CandidateProfile';
import { PipelineKanban } from './components/recruitment/PipelineKanban';
import { InterviewsList } from './components/recruitment/InterviewsList';
import { CsvImporter } from './components/recruitment/CsvImporter';
import { DuplicateReviewQueue } from './components/recruitment/DuplicateReviewQueue';
import { OutlookInbox } from './components/inbox/OutlookInbox';
import { EmailTemplates } from './components/inbox/EmailTemplates';
import { OnboardingList } from './components/onboarding/OnboardingList';
import { PeopleDirectory } from './components/people/PeopleDirectory';
import { LiveAttendance } from './components/attendance/LiveAttendance';
import { Timesheets } from './components/attendance/Timesheets';
import { LeavePage } from './components/leave/LeavePage';
import { HrTasksList } from './components/work/HrTasksList';
import { DailyLogsPage } from './components/work/DailyLogsPage';
import { WeeklyReportsPage } from './components/work/WeeklyReportsPage';
import { PerformancePage } from './components/performance/PerformancePage';
import { OffboardingPage } from './components/offboarding/OffboardingPage';
import { ReportsPage } from './components/reports/ReportsPage';
import { NotificationCenter } from './components/notifications/NotificationCenter';
import { AuditLogPage } from './components/audit/AuditLogPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { CareersPage } from './components/careers/CareersPage';
import { VerifyCertificate } from './components/verification/VerifyCertificate';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CompanyProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/careers" element={<CareersPage />} />
                <Route path="/verify/:certId" element={<VerifyCertificate />} />

                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  {/* Dashboard */}
                  <Route index element={<Dashboard />} />

                  {/* Recruitment (HR Only) */}
                  <Route path="recruitment/vacancies" element={<ProtectedRoute requireHr><VacanciesList /></ProtectedRoute>} />
                  <Route path="recruitment/applications" element={<ProtectedRoute requireHr><ApplicationsTable /></ProtectedRoute>} />
                  <Route path="recruitment/candidates" element={<ProtectedRoute requireHr><ApplicationsTable /></ProtectedRoute>} />
                  <Route path="recruitment/candidates/:candidateId" element={<ProtectedRoute requireHr><CandidateProfile /></ProtectedRoute>} />
                  <Route path="recruitment/pipeline" element={<ProtectedRoute requireHr><PipelineKanban /></ProtectedRoute>} />
                  <Route path="recruitment/interviews" element={<ProtectedRoute requireHr><InterviewsList /></ProtectedRoute>} />
                  <Route path="recruitment/import" element={<ProtectedRoute requireHr><CsvImporter /></ProtectedRoute>} />
                  <Route path="recruitment/duplicates" element={<ProtectedRoute requireHr><DuplicateReviewQueue /></ProtectedRoute>} />

                  {/* Communication (HR Only) */}
                  <Route path="inbox" element={<ProtectedRoute requireHr><OutlookInbox /></ProtectedRoute>} />
                  <Route path="inbox/assigned" element={<ProtectedRoute requireHr><OutlookInbox /></ProtectedRoute>} />
                  <Route path="inbox/sent" element={<ProtectedRoute requireHr><OutlookInbox /></ProtectedRoute>} />
                  <Route path="inbox/templates" element={<ProtectedRoute requireHr><EmailTemplates /></ProtectedRoute>} />

                  {/* Onboarding (HR Only) */}
                  <Route path="onboarding" element={<ProtectedRoute requireHr><OnboardingList /></ProtectedRoute>} />
                  <Route path="onboarding/documents" element={<ProtectedRoute requireHr><OnboardingList /></ProtectedRoute>} />

                  {/* People & Directory */}
                  <Route path="people/interns" element={<PeopleDirectory />} />
                  <Route path="people/team" element={<PeopleDirectory />} />
                  <Route path="people/alumni" element={<PeopleDirectory />} />

                  {/* Attendance & Timesheets */}
                  <Route path="attendance/live" element={<ProtectedRoute requireHr><LiveAttendance /></ProtectedRoute>} />
                  <Route path="attendance/timesheets" element={<Timesheets />} />
                  <Route path="attendance/my" element={<Timesheets />} />

                  {/* Leave */}
                  <Route path="leave" element={<LeavePage />} />

                  {/* Work & Logs */}
                  <Route path="work/tasks" element={<ProtectedRoute requireHr><HrTasksList /></ProtectedRoute>} />
                  <Route path="work/daily-logs" element={<DailyLogsPage />} />
                  <Route path="work/weekly-reports" element={<WeeklyReportsPage />} />

                  {/* Performance */}
                  <Route path="performance" element={<PerformancePage />} />

                  {/* Offboarding (HR Only) */}
                  <Route path="offboarding" element={<ProtectedRoute requireHr><OffboardingPage /></ProtectedRoute>} />
                  <Route path="offboarding/ending-soon" element={<ProtectedRoute requireHr><OffboardingPage /></ProtectedRoute>} />

                  {/* Reports, Notifications, Audit, Settings */}
                  <Route path="reports" element={<ProtectedRoute requireHr><ReportsPage /></ProtectedRoute>} />
                  <Route path="notifications" element={<NotificationCenter />} />
                  <Route path="audit" element={<ProtectedRoute requireHr><AuditLogPage /></ProtectedRoute>} />
                  <Route path="settings" element={<ProtectedRoute requireHr><SettingsPage /></ProtectedRoute>} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </CompanyProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
