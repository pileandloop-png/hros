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
    type: 'INITIAL_CANDIDATE_EMAIL',
    title: 'Initial Candidate Outreach',
    subject: 'Pile & Loop: Thank you for your application for {{position}}',
    bodyTemplate: 'Dear {{candidateName}},\n\nThank you for applying for the {{position}} internship at Pile & Loop. We have received your application and would like to learn more about your experience.\n\nOur internship program is a remote, learning-based opportunity with approximately 5 productive hours per day (Monday-Saturday, core window 09:00 AM - 04:00 PM PKT).\n\nPlease let us know if this aligns with your availability, and reply with links to your portfolio or past projects.\n\nBest regards,\n{{hrRepresentativeName}}\nPile & Loop Human Resources',
  },
  {
    type: 'INTERVIEW_INVITATION',
    title: 'Interview Invitation',
    subject: 'Interview Invitation: Pile & Loop - {{position}}',
    bodyTemplate: 'Dear {{candidateName}},\n\nFollowing your initial review, we are pleased to invite you to an interview for the {{position}} internship.\n\nPlease select a time slot that suits you best using our calendar booking link:\n{{bookingLink}}\n\nWe look forward to speaking with you!\n\nBest regards,\nPile & Loop HR Team',
  },
  {
    type: 'SELECTION',
    title: 'Selection & Offer Notification',
    subject: 'Congratulations! Selection for Pile & Loop {{position}} Internship',
    bodyTemplate: 'Dear {{candidateName}},\n\nWe are excited to inform you that you have been selected for the {{position}} internship at Pile & Loop!\n\nYour internship will commence on {{startDate}} for a duration of 4 months. Please review the attached Internship Agreement and prepare your onboarding documentation (CNIC copies, transcript, internet speed test, and PC specs).\n\nWelcome to the Pile & Loop team!\n\nBest regards,\n{{hrRepresentativeName}}',
  },
  {
    type: 'FOLLOW_UP_1',
    title: 'Follow-Up 1',
    subject: 'Following up: Your application with Pile & Loop',
    bodyTemplate: 'Dear {{candidateName}},\n\nI hope you are doing well. We are following up regarding our earlier message about your application for the {{position}} internship.\n\nPlease let us know if you remain interested in proceeding with the selection process.\n\nBest regards,\n{{hrRepresentativeName}}\nPile & Loop Human Resources',
  },
  {
    type: 'FOLLOW_UP_2',
    title: 'Follow-Up 2 (Final Follow-up)',
    subject: 'Final follow-up: Pile & Loop {{position}} Application',
    bodyTemplate: 'Dear {{candidateName}},\n\nWe have not heard back regarding your application for the {{position}} internship. As per our recruitment policy, this is our final follow-up.\n\nIf we do not hear from you within 48 hours, we will close your application. You are always welcome to apply for future vacancies.\n\nBest regards,\nPile & Loop HR',
  },
  {
    type: 'NOT_SELECTED',
    title: 'Application Not Selected',
    subject: 'Your application with Pile & Loop',
    bodyTemplate: 'Dear {{candidateName}},\n\nThank you for taking the time to apply for the {{position}} internship at Pile & Loop and speaking with our team.\n\nAfter careful consideration, we have decided to move forward with other candidates whose profiles more closely match our current project needs. We will keep your CV on file for future openings.\n\nWe wish you all the best in your career pursuits.\n\nSincerely,\nPile & Loop Recruitment Team',
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
    <div className="space-y-4 max-w-6xl mx-auto">
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
