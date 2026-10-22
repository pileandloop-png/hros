import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { FileText, Edit2, Plus, Copy, Check } from 'lucide-react';

const SEED_TEMPLATES = [
  {
    type: 'FIVE_QUESTION_SCREENING',
    title: '5 AI Screening Questions (Automated Assessment)',
    subject: 'Application for {{position}} at Pile & Loop - Initial Screening Questions',
    bodyTemplate: 'Dear {{candidateName}},\n\nThank you for applying for the {{position}} opening at Pile & Loop! We have reviewed your credentials and would like to proceed with the next phase of our automated talent screening.\n\nPlease reply directly to this email answering the following 5 questions:\n\nQ1 [Core Technical Competency]:\nCan you describe your hands-on experience with our core stack and any complex production projects you built?\n\nQ2 [Portfolio & Project]:\nPlease share your active GitHub / Figma / portfolio link and explain the hardest bug or architectural challenge you solved.\n\nQ3 [Working Hours & Punctuality]:\nAre you available to commit to our core working hours (09:00 AM - 04:00 PM PKT / 40 hours per week) on a consistent daily schedule?\n\nQ4 [Notice Period & Start Date]:\nWhat is your earliest confirmed start date, and what is your notice period with any current commitments?\n\nQ5 [Degree Prerequisite Verification]:\nCan you please confirm your university, degree title, and graduation year? (Note: A 4-year Bachelor degree is required).\n\nBest regards,\nTalent Acquisition Team\nPile & Loop',
  },
  {
    type: 'BELOW_BACHELOR_NOTICE',
    title: 'Below-Bachelor Educational Prerequisite Notice (Polite Rejection)',
    subject: 'Update regarding your application for {{position}} at Pile & Loop',
    bodyTemplate: 'Dear {{candidateName}},\n\nThank you for your interest in Pile & Loop and for applying for the {{position}} opening.\n\nWe have reviewed your profile and application details. Our prerequisite for this role necessitates a completed or final-semester 4-year Bachelor degree (BS/BSc/BE in Computer Science, Software Engineering, or related field).\n\nBased on your credentials, your highest detected qualification is below our current undergraduate degree prerequisite. Therefore, we are unable to advance your application for this opening at this time.\n\nIf you are currently enrolled in a recognized university degree program and graduating soon, please feel free to reply with your projected graduation date.\n\nWe sincerely appreciate your interest and wish you the best in your academic and professional endeavors.\n\nWarm regards,\nTalent Acquisition Team\nPile & Loop',
  },
  {
    type: 'OFFICIAL_ONBOARDING_GUIDE',
    title: 'Official Onboarding Guide & First Day Instructions (Interview Passed)',
    subject: 'Welcome to Pile & Loop! Official Onboarding Guide & First Day Instructions [{{position}}]',
    bodyTemplate: 'Dear {{candidateName}},\n\nCongratulations! Following your successful interview with our hiring team, you have officially PASSED the evaluation and have been selected for the {{position}} position at Pile & Loop!\n\nWelcome to the team! Below is your Official Onboarding Guide and orientation checklist for your first day:\n\n1. REPORTING & COMMENCEMENT DETAILS:\n• Official Start Date: {{startDate}}\n• Daily Reporting Hours: 09:00 AM - 04:00 PM PKT\n• Office Location: Suite 402, Al-Hafeez Commercial Complex, Main Boulevard, Gulberg III, Lahore, Pakistan\n\n2. PRE-ONBOARDING DOCUMENTATION CHECKLIST:\nPlease email digital copies of the following prior to your start date:\n[ ] 1. Scanned Copy of CNIC (Front & Back)\n[ ] 2. University Degree or Official Transcript\n[ ] 3. Emergency Contact Details\n[ ] 4. Bank Account Details (IBAN) for payroll\n\n3. TOOLING ACCESS:\n• Slack / Discord invite sent to this email.\n• Portal access: https://pileandloop.com/onboarding\n\nPlease reply confirming receipt of this onboarding guide.\n\nWarm regards,\nPeople Operations & Human Resources\nPile & Loop',
  },
  {
    type: 'INTERVIEW_INVITATION',
    title: 'Google Meet Technical Interview Invitation',
    subject: 'Interview Scheduled: Pile & Loop - {{position}}',
    bodyTemplate: 'Dear {{candidateName}},\n\nCongratulations! Following your screening score, we are pleased to confirm your technical interview for the {{position}} position.\n\nInterview Details:\n• Mode: Google Meet Video Call\n• Link: {{meetingLink}}\n• Date & Time: {{timeSlot}} (PKT)\n\nPlease test your camera and microphone beforehand and join 5 minutes early.\n\nBest regards,\nPile & Loop HR Team',
  }
];

export const EmailTemplates: React.FC = () => {
  const { isSupervisor } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'emailTemplates'));
      if (snap.empty) {
        // Seed initial templates
        for (const t of SEED_TEMPLATES) {
          await setDoc(doc(db, 'emailTemplates', t.type), {
            ...t,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        setTemplates(SEED_TEMPLATES);
      } else {
        setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTemplate) return;
    try {
      await setDoc(doc(db, 'emailTemplates', currentTemplate.type || currentTemplate.id), {
        ...currentTemplate,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setEditModalOpen(false);
      loadTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to save template');
    }
  };

  const copyVariable = (v: string) => {
    navigator.clipboard.writeText(v);
    setCopiedKey(v);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">HR Email Templates</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage standardized, dynamic email templates for candidate communications</p>
        </div>
      </div>

      {/* Available Variables Guide */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-xs space-y-2">
        <h4 className="font-semibold text-slate-800">Supported Dynamic Variables:</h4>
        <div className="flex flex-wrap gap-2">
          {['{{candidateName}}', '{{position}}', '{{applicationId}}', '{{bookingLink}}', '{{startDate}}', '{{endDate}}', '{{hrRepresentativeName}}', '{{companyName}}'].map((v) => (
            <button
              key={v}
              onClick={() => copyVariable(v)}
              className="px-2 py-1 bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 rounded font-mono text-[11px] flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <span>{v}</span>
              {copiedKey === v ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
            </button>
          ))}
        </div>
      </div>

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((tpl) => (
          <div key={tpl.type || tpl.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3 text-xs">
            <div>
              <div className="flex items-start justify-between">
                <h4 className="font-bold text-slate-900 text-sm">{tpl.title}</h4>
                <Badge variant="neutral">{tpl.type}</Badge>
              </div>
              <p className="text-slate-500 mt-1 font-mono text-[11px]">Subject: {tpl.subject}</p>
              <p className="text-slate-600 mt-2 bg-slate-50 p-2.5 rounded border border-slate-100 font-mono text-[11px] whitespace-pre-line line-clamp-4">
                {tpl.bodyTemplate}
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => {
                setCurrentTemplate(tpl);
                setEditModalOpen(true);
              }}>
                <Edit2 className="w-3.5 h-3.5 mr-1" />
                Edit Template
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {currentTemplate && (
        <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title={`Edit Template: ${currentTemplate.title}`} maxWidth="lg">
          <form onSubmit={handleSaveTemplate} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Subject Line</label>
              <input
                type="text"
                required
                value={currentTemplate.subject}
                onChange={(e) => setCurrentTemplate({ ...currentTemplate, subject: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Template Body</label>
              <textarea
                rows={10}
                required
                value={currentTemplate.bodyTemplate}
                onChange={(e) => setCurrentTemplate({ ...currentTemplate, bodyTemplate: e.target.value })}
                className="w-full p-2.5 border rounded font-mono text-xs"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button size="sm" variant="outline" type="button" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit">
                Save Template Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
