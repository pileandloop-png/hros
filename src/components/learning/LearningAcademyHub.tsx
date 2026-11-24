import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  Award,
  Users,
  Search,
  Plus,
  Send,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  Link2,
  Edit3,
  Trash2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  Code2,
  Palette,
  Terminal,
  Bookmark
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { useToast } from '../../contexts/ToastContext';
import { store } from '../../services/store';
import { appleHaptics } from '../../utils/appleHaptics';
import { sendHrEmail } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export interface SyllabusItem {
  title: string;
  duration: string;
  summary: string;
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: 'Engineering' | 'Design & UX' | 'Compliance & Security' | 'Recruitment & AI' | 'Onboarding Core';
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  instructor: string;
  externalAppUrl?: string;
  tags: string[];
  enrolledCount: number;
  completedCount: number;
  featured?: boolean;
  publishedDate: string;
  syllabus: SyllabusItem[];
}

export interface Enrollment {
  id: string;
  courseId: string;
  courseTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  progressPercent: number;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  assignedDate: string;
  completedDate?: string;
  pushedBy: string;
  lastPushedAt?: string;
  certificateId?: string;
  certificateUrl?: string;
}

export const LearningAcademyHub: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'catalog' | 'radar' | 'certificates'>('catalog');
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedCourseForAssign, setSelectedCourseForAssign] = useState<Course | null>(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [assignDeadline, setAssignDeadline] = useState('14');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Edit Course URL Modal
  const [editUrlModalOpen, setEditUrlModalOpen] = useState(false);
  const [selectedCourseForUrl, setSelectedCourseForUrl] = useState<Course | null>(null);
  const [tempAppUrl, setTempAppUrl] = useState('');

  // Course Details / Viewer Modal
  const [viewCourseModalOpen, setViewCourseModalOpen] = useState(false);
  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);
  const [selectedEnrollmentForView, setSelectedEnrollmentForView] = useState<Enrollment | null>(null);

  // Add New Course Modal
  const [createCourseModalOpen, setCreateCourseModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<Course['category']>('Engineering');
  const [newLevel, setNewLevel] = useState<Course['level']>('Intermediate');
  const [newDuration, setNewDuration] = useState('3 Hours');
  const [newInstructor, setNewInstructor] = useState('Technical Lead');
  const [newAppUrl, setNewAppUrl] = useState('');

  const loadData = () => {
    const rawCourses = store.getCollection('courses') || {};
    setCourses(Object.values(rawCourses));

    const rawEnrollments = store.getCollection('courseEnrollments') || {};
    setEnrollments(Object.values(rawEnrollments));

    const rawPeople = store.getCollection('people') || {};
    setPeople(Object.values(rawPeople));
  };

  useEffect(() => {
    loadData();
    const unsub = store.subscribe((col) => {
      if (col === 'courses' || col === 'courseEnrollments' || col === 'people') {
        loadData();
      }
    });
    return () => unsub();
  }, []);

  // Filtered courses
  const filteredCourses = courses.filter((c) => {
    const matchesCat = selectedCategory === 'ALL' || c.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q)) ||
      c.instructor.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const categories = [
    'ALL',
    'Engineering',
    'Design & UX',
    'Compliance & Security',
    'Recruitment & AI',
    'Onboarding Core'
  ];

  // 1-Click "Push to Learn"
  const handleDispatchCourseAssignment = async () => {
    if (!selectedCourseForAssign || !targetUserId) {
      toast.error('Please select an employee/intern to assign this course.');
      return;
    }

    const targetPerson = people.find((p) => p.id === targetUserId || p.uid === targetUserId);
    if (!targetPerson) {
      toast.error('Selected team member could not be resolved.');
      return;
    }

    setAssignLoading(true);
    const enrollId = `enroll-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const courseUrl = selectedCourseForAssign.externalAppUrl || window.location.origin + '/learning';

    try {
      // 1. Create or update Enrollment in Store
      const newEnrollment: Enrollment = {
        id: enrollId,
        courseId: selectedCourseForAssign.id,
        courseTitle: selectedCourseForAssign.title,
        userId: targetPerson.id || targetPerson.uid,
        userName: targetPerson.fullName || targetPerson.name || 'Team Member',
        userEmail: targetPerson.email || targetPerson.personalEmail || 'member@pileandloop.com',
        role: targetPerson.designation || targetPerson.role || 'Intern',
        progressPercent: 0,
        status: 'ASSIGNED',
        assignedDate: timestamp,
        pushedBy: 'hr@pileandloop.com',
        lastPushedAt: timestamp
      };

      store.setDocument('courseEnrollments', enrollId, newEnrollment, true);

      // Increment course enrolled count
      store.setDocument(
        'courses',
        selectedCourseForAssign.id,
        {
          ...selectedCourseForAssign,
          enrolledCount: (selectedCourseForAssign.enrolledCount || 0) + 1
        },
        true
      );

      // 2. Dispatch Official Email to Employee via Direct SMTP
      const subject = `[Pile & Loop Academy] New Learning Track Assigned: ${selectedCourseForAssign.title}`;
      const bodyText = `Dear ${newEnrollment.userName},\n\nYou have been enrolled in the following internal training curriculum at Pile & Loop:\n\nCourse: ${selectedCourseForAssign.title}\nLevel: ${selectedCourseForAssign.level} • Duration: ${selectedCourseForAssign.duration}\nInstructor: ${selectedCourseForAssign.instructor}\n\nAccess Your Interactive Course Line:\n${courseUrl}\n\nPlease complete this track within ${assignDeadline} days. Your completion progress is tracked automatically in your Employee HR Portal.\n\nBest regards,\nPile & Loop Talent & Learning Operations`;

      await sendHrEmail({
        to: newEnrollment.userEmail,
        subject,
        textBody: bodyText,
        htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #0f172a; margin-top: 0;">Pile & Loop Training Academy</h2>
          <p>Dear <strong>${newEnrollment.userName}</strong>,</p>
          <p>You have been assigned the following internal learning curriculum:</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0; color: #0284c7;">${selectedCourseForAssign.title}</h3>
            <p style="margin: 0; font-size: 13px; color: #64748b;">${selectedCourseForAssign.subtitle}</p>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #334155;"><strong>Level:</strong> ${selectedCourseForAssign.level} &bull; <strong>Duration:</strong> ${selectedCourseForAssign.duration}</p>
          </div>
          <p>Access your interactive learning modules by clicking below:</p>
          <p style="margin: 20px 0;">
            <a href="${courseUrl}" style="background: #0f172a; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">Launch Course App &rarr;</a>
          </p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">Pile & Loop Learning &amp; People Operations &bull; mail.pileandloop.com</p>
        </div>`,
        idempotencyKey: `course_assign_${enrollId}`
      });

      // Play Apple Mail Sent Chime
      appleHaptics.playSentChime();
      toast.success(`"Push to Learn" complete! Notification dispatched to ${newEnrollment.userEmail}.`);

      setAssignModalOpen(false);
      setSelectedCourseForAssign(null);
      setTargetUserId('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch course assignment');
    } finally {
      setAssignLoading(false);
    }
  };

  // Update External App URL
  const handleSaveAppUrl = () => {
    if (!selectedCourseForUrl) return;
    const updated = {
      ...selectedCourseForUrl,
      externalAppUrl: tempAppUrl.trim()
    };
    store.setDocument('courses', selectedCourseForUrl.id, updated, true);
    appleHaptics.playClick();
    toast.success(`Course external app link updated for "${selectedCourseForUrl.title}"!`);
    setEditUrlModalOpen(false);
  };

  // Nudge / Re-push learning notification
  const handleSendReminder = async (enroll: Enrollment) => {
    const course = courses.find((c) => c.id === enroll.courseId);
    const courseUrl = course?.externalAppUrl || window.location.origin + '/learning';

    try {
      await sendHrEmail({
        to: enroll.userEmail,
        subject: `[Reminder] Continue Your Course: ${enroll.courseTitle}`,
        textBody: `Hi ${enroll.userName},\n\nThis is a gentle reminder to continue your assigned training track "${enroll.courseTitle}". Your current progress is ${enroll.progressPercent}%.\n\nAccess Course Link: ${courseUrl}\n\nBest,\nPile & Loop Talent Team`,
        htmlBody: `<p>Hi <strong>${enroll.userName}</strong>,</p><p>Please remember to complete your assigned course <strong>${enroll.courseTitle}</strong>. Current progress: <strong>${enroll.progressPercent}%</strong>.</p><p><a href="${courseUrl}">Click here to continue &rarr;</a></p>`,
        idempotencyKey: `nudge_${enroll.id}_${Date.now()}`
      });

      // Update last pushed at
      store.setDocument(
        'courseEnrollments',
        enroll.id,
        {
          ...enroll,
          lastPushedAt: new Date().toISOString()
        },
        true
      );

      appleHaptics.playSentChime();
      toast.info(`Reminder dispatched to ${enroll.userName} (${enroll.userEmail})!`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to send reminder');
    }
  };

  // Mark completion & generate certificate
  const handleUpdateProgress = (enroll: Enrollment, newPercent: number) => {
    const isNowDone = newPercent >= 100;
    const certId = isNowDone && !enroll.certificateId ? `CERT-ACADEMY-${Math.floor(1000 + Math.random() * 9000)}` : enroll.certificateId;

    const updated: Enrollment = {
      ...enroll,
      progressPercent: newPercent,
      status: isNowDone ? 'COMPLETED' : 'IN_PROGRESS',
      completedDate: isNowDone ? new Date().toISOString() : undefined,
      certificateId: certId,
      certificateUrl: certId ? `/verify/${certId}` : undefined
    };

    store.setDocument('courseEnrollments', enroll.id, updated, true);

    if (isNowDone) {
      appleHaptics.playSuccessChime();
      toast.success(`🎉 Congratulations! ${enroll.userName} completed "${enroll.courseTitle}"! Certificate ${certId} issued.`);
    } else {
      appleHaptics.playClick();
    }
  };

  // Create new custom course
  const handleCreateCourse = () => {
    if (!newTitle.trim()) {
      toast.error('Please enter course title');
      return;
    }

    const newId = `course-${Date.now()}`;
    const newCourseObj: Course = {
      id: newId,
      title: newTitle.trim(),
      subtitle: newSubtitle.trim() || 'Internal training curriculum',
      description: newDesc.trim() || 'Custom training module created by HR.',
      category: newCategory,
      level: newLevel,
      duration: newDuration.trim() || '2 Hours',
      instructor: newInstructor.trim() || 'HR Lead',
      externalAppUrl: newAppUrl.trim(),
      tags: [newCategory, newLevel],
      enrolledCount: 0,
      completedCount: 0,
      publishedDate: new Date().toISOString(),
      syllabus: [
        { title: 'Module 1: Orientation & Fundamentals', duration: '30m', summary: 'Introduction and setup.' },
        { title: 'Module 2: Practical Exercises & Verification', duration: '45m', summary: 'Hands-on application.' }
      ]
    };

    store.setDocument('courses', newId, newCourseObj, true);
    appleHaptics.playSuccessChime();
    toast.success(`New course "${newCourseObj.title}" published!`);
    setCreateCourseModalOpen(false);

    // Reset fields
    setNewTitle('');
    setNewSubtitle('');
    setNewDesc('');
    setNewAppUrl('');
  };

  const getCategoryColor = (cat: Course['category']) => {
    switch (cat) {
      case 'Engineering':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Design & UX':
        return 'bg-violet-50 text-violet-800 border-violet-200';
      case 'Compliance & Security':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Recruitment & AI':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'Onboarding Core':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Apple HIG Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Pile &amp; Loop Academy &amp; Learning Tracks
            </h1>
            <Badge variant="success">L&amp;D Engine 2.0</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
            Assign structured internal training to interns and staff. Embed your custom course app lines, 
            trigger automated <strong>"Push to Learn"</strong> email dispatches via direct SMTP, track real-time completion progress, and issue verified completion credentials.
          </p>
        </div>

        {/* Action Center */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreateCourseModalOpen(true)}
            className="text-xs font-semibold bg-white border-slate-200 hover:bg-slate-50"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-slate-600" />
            New Course Track
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setSelectedCourseForAssign(courses[0] || null);
              setAssignModalOpen(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs"
          >
            <Send className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
            Push to Learn (Assign)
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Available Courses</span>
            <BookOpen className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{courses.length}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">5 Core tracks published</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Active Enrollments</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{enrollments.length}</div>
          <span className="text-[11px] text-sky-600 mt-0.5 block font-medium">Interns &amp; full-time staff</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Completed Tracks</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">
            {enrollments.filter((e) => e.status === 'COMPLETED').length}
          </div>
          <span className="text-[11px] text-emerald-600 mt-0.5 block font-medium">100% Milestone achieved</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Issued Certificates</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">
            {enrollments.filter((e) => Boolean(e.certificateId)).length}
          </div>
          <span className="text-[11px] text-amber-700 mt-0.5 block font-medium">Verifiable QR Credentials</span>
        </div>
      </div>

      {/* Navigation Segmented Control */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div className="inline-flex p-1 rounded-xl bg-slate-100/80 border border-slate-200/70 text-xs">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Course Catalog ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab('radar')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'radar'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Team Progress Radar ({enrollments.length})
          </button>
          <button
            onClick={() => setActiveTab('certificates')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'certificates'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Verifiable Certificates ({enrollments.filter((e) => Boolean(e.certificateId)).length})
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search tracks, skills, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>
      </div>

      {/* TAB 1: COURSE CATALOG */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Category & Level Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCategoryColor(
                        course.category
                      )}`}
                    >
                      {course.category}
                    </span>
                    <span className="text-[11px] font-mono font-medium text-slate-400">
                      {course.level} &bull; {course.duration}
                    </span>
                  </div>

                  {/* Title & Subtitle */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{course.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{course.subtitle}</p>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {course.description}
                  </p>

                  {/* External App / Course Line Bar */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1 uppercase tracking-wider">
                        <Link2 className="w-3 h-3 text-slate-400" />
                        External Course App Line
                      </span>
                      <button
                        onClick={() => {
                          setSelectedCourseForUrl(course);
                          setTempAppUrl(course.externalAppUrl || '');
                          setEditUrlModalOpen(true);
                        }}
                        className="text-[10px] font-semibold text-sky-700 hover:text-sky-900 cursor-pointer flex items-center gap-0.5"
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                        Edit Link
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <span className="font-mono text-[11px] text-slate-700 truncate max-w-[210px]" title={course.externalAppUrl}>
                        {course.externalAppUrl || 'No app line configured yet'}
                      </span>
                      {course.externalAppUrl && (
                        <a
                          href={course.externalAppUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-slate-400 hover:text-slate-800"
                          title="Open course application in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {course.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-700">{course.enrolledCount}</span> learners enrolled
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setViewingCourse(course);
                        setViewCourseModalOpen(true);
                      }}
                      className="text-xs font-semibold py-1 px-2.5"
                    >
                      Syllabus
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedCourseForAssign(course);
                        setAssignModalOpen(true);
                      }}
                      className="text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 py-1 px-3 shadow-2xs"
                    >
                      <Send className="w-3 h-3 mr-1 text-emerald-400" />
                      Push
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: TEAM PROGRESS RADAR */}
      {activeTab === 'radar' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Enrolled Workforce &amp; Progress Radar</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time tracking of team member course completion, milestones and reminder dispatches.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">{enrollments.length} Active Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Learner</th>
                  <th className="py-3 px-4">Course Track</th>
                  <th className="py-3 px-4">Status &amp; Progress</th>
                  <th className="py-3 px-4">Assigned Date</th>
                  <th className="py-3 px-4">Last Pushed / Nudge</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrollments.map((en) => (
                  <tr key={en.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{en.userName}</div>
                      <div className="text-[11px] text-slate-400">{en.userEmail} &bull; {en.role}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{en.courseTitle}</div>
                      <span className="text-[10px] text-slate-400">Assigned by {en.pushedBy}</span>
                    </td>

                    <td className="py-3.5 px-4 w-48">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-700">{en.progressPercent}%</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            en.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {en.status}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            en.status === 'COMPLETED' ? 'bg-emerald-600' : 'bg-sky-600'
                          }`}
                          style={{ width: `${en.progressPercent}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(en.assignedDate).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {en.lastPushedAt ? new Date(en.lastPushedAt).toLocaleDateString() : 'Initial Push'}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {en.status !== 'COMPLETED' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendReminder(en)}
                            className="text-[11px] py-1 px-2 text-sky-700 border-sky-200 hover:bg-sky-50"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Nudge
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const nextProgress = Math.min(100, en.progressPercent + 25);
                              handleUpdateProgress(en, nextProgress);
                            }}
                            className="text-[11px] py-1 px-2"
                          >
                            +25% Progress
                          </Button>
                        </>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Certificate Issued
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: VERIFIABLE CERTIFICATES */}
      {activeTab === 'certificates' && (
        <div className="space-y-4">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                  Cryptographically Verified Course Certifications
                </h4>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Each certificate is issued upon reaching 100% course completion and can be verified publicly by university supervisors or future employers.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrollments
              .filter((e) => Boolean(e.certificateId))
              .map((cert) => (
                <div
                  key={cert.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                      {cert.certificateId}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {cert.completedDate ? new Date(cert.completedDate).toLocaleDateString() : 'Verified'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{cert.userName}</h4>
                    <p className="text-xs text-slate-500">{cert.role} &bull; {cert.userEmail}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Course Title</span>
                    <strong className="text-slate-800 text-xs">{cert.courseTitle}</strong>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      100% Completed
                    </span>

                    <button
                      onClick={() => navigate(`/verify/${cert.certificateId}`)}
                      className="text-xs font-semibold text-slate-900 hover:text-emerald-600 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Public Verification</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* MODAL 1: PUSH TO LEARN (ASSIGN COURSE) */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Push to Learn — Assign Course & Dispatch Email"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed text-[11px]">
            Assign this training track to an employee or intern. The system will record their enrollment and immediately dispatch an official learning invitation via <strong>cPanel SMTP (mail.pileandloop.com)</strong>.
          </p>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Target Course Track</label>
            <select
              value={selectedCourseForAssign?.id || ''}
              onChange={(e) => {
                const found = courses.find((c) => c.id === e.target.value);
                setSelectedCourseForAssign(found || null);
              }}
              className="w-full p-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.level} &bull; {c.duration})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Employee / Intern</label>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full p-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="">-- Choose Team Member --</option>
              {people.map((p) => (
                <option key={p.id || p.uid} value={p.id || p.uid}>
                  {p.fullName || p.name || 'Member'} &bull; {p.designation || p.role || 'Staff'} ({p.email || p.personalEmail})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Completion Timeline</label>
              <select
                value={assignDeadline}
                onChange={(e) => setAssignDeadline(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 text-xs"
              >
                <option value="7">7 Days (FastTrack)</option>
                <option value="14">14 Days (Standard)</option>
                <option value="30">30 Days (Comprehensive)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Sender Email Relay</label>
              <input
                type="text"
                disabled
                value="hr@pileandloop.com (cPanel TLS)"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-mono text-[11px]"
              />
            </div>
          </div>

          {selectedCourseForAssign?.externalAppUrl && (
            <div className="bg-sky-50 p-2.5 rounded-xl border border-sky-200 text-sky-900 text-[11px] flex items-center justify-between">
              <span className="truncate">Includes App Line: <strong>{selectedCourseForAssign.externalAppUrl}</strong></span>
              <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 ml-2" />
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleDispatchCourseAssignment}
              disabled={assignLoading || !targetUserId}
              className="bg-slate-900 text-white hover:bg-slate-800 font-semibold text-xs"
            >
              <Send className={`w-3.5 h-3.5 mr-1.5 ${assignLoading ? 'animate-spin' : 'text-emerald-400'}`} />
              {assignLoading ? 'Dispatching...' : 'Dispatch "Push to Learn"'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: EDIT EXTERNAL APP URL */}
      <Modal
        isOpen={editUrlModalOpen}
        onClose={() => setEditUrlModalOpen(false)}
        title="Configure Course External App / Course Line URL"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed text-[11px]">
            Paste the external web URL or learning application link where students/interns will take this course. 
            This link is included in their invitation emails and course launch cards.
          </p>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              External App / Web URL
            </label>
            <input
              type="url"
              placeholder="https://learn.pileandloop.com/tracks/my-course-app"
              value={tempAppUrl}
              onChange={(e) => setTempAppUrl(e.target.value)}
              className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditUrlModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveAppUrl}
              className="bg-slate-900 text-white hover:bg-slate-800 font-semibold text-xs"
            >
              Save Link
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: COURSE SYLLABUS & DETAILS */}
      <Modal
        isOpen={viewCourseModalOpen}
        onClose={() => setViewCourseModalOpen(false)}
        title={viewingCourse?.title || 'Course Details'}
        maxWidth="md"
      >
        {viewingCourse && (
          <div className="space-y-4 text-xs">
            <div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCategoryColor(viewingCourse.category)}`}>
                {viewingCourse.category}
              </span>
              <p className="text-xs text-slate-500 mt-1">{viewingCourse.subtitle}</p>
            </div>

            <p className="text-slate-600 text-xs leading-relaxed">{viewingCourse.description}</p>

            <div className="border-t border-slate-100 pt-3">
              <h4 className="font-bold text-slate-900 text-xs mb-2">Curriculum Syllabus &amp; Modules</h4>
              <div className="space-y-2">
                {viewingCourse.syllabus.map((syl, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">{syl.title}</span>
                      <span className="font-mono text-[10px] text-slate-400">{syl.duration}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{syl.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            {viewingCourse.externalAppUrl && (
              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-500 font-mono text-[11px]">Direct Launch URL Ready</span>
                <a
                  href={viewingCourse.externalAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800"
                >
                  <span>Launch in External App</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* MODAL 4: CREATE CUSTOM COURSE TRACK */}
      <Modal
        isOpen={createCourseModalOpen}
        onClose={() => setCreateCourseModalOpen(false)}
        title="Create New Internal Course Track"
        maxWidth="md"
      >
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Course Title</label>
            <input
              type="text"
              placeholder="e.g. Next.js 15 Full-Stack Architecture"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Subtitle / Headline</label>
            <input
              type="text"
              placeholder="e.g. Server components, streaming & database connection pools"
              value={newSubtitle}
              onChange={(e) => setNewSubtitle(e.target.value)}
              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
              >
                <option value="Engineering">Engineering</option>
                <option value="Design & UX">Design & UX</option>
                <option value="Compliance & Security">Compliance & Security</option>
                <option value="Recruitment & AI">Recruitment & AI</option>
                <option value="Onboarding Core">Onboarding Core</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Level</label>
              <select
                value={newLevel}
                onChange={(e) => setNewLevel(e.target.value as any)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">External Course App Line (URL)</label>
            <input
              type="url"
              placeholder="https://learn.pileandloop.com/tracks/..."
              value={newAppUrl}
              onChange={(e) => setNewAppUrl(e.target.value)}
              className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Detail what the learner will gain and pre-requisites..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateCourseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateCourse}
              className="bg-slate-900 text-white hover:bg-slate-800 font-semibold text-xs"
            >
              Publish Course Track
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
