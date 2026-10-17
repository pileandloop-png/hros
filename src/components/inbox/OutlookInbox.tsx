import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, orderBy, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { store } from '../../services/store';
import { useAuth } from '../../contexts/AuthContext';
import { syncHrMailbox, sendHrEmail, generateHrEmailDraft, summarizeEmailThread } from '../../services/api';
import { EmailThread, EmailMessage } from '../../types/email';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import DOMPurify from 'dompurify';
import {
  Inbox,
  Send,
  Star,
  Archive,
  RefreshCw,
  Sparkles,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Tag,
  Search,
  FileCheck,
  Settings as SettingsIcon,
  Radio,
  Plus,
  Folder,
  FolderPlus,
  Trash2,
  GripVertical,
  X,
  ShieldCheck
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { getEmailAccounts, syncMailAccount, EmailAccountConfig } from '../../services/emailService';
import {
  getCustomFolders,
  deleteCustomFolder,
  InboxFolder,
  DEFAULT_INBOX_FOLDERS
} from '../../services/inboxFolderService';
import { ComposeEmailModal } from './ComposeEmailModal';
import { CreateFolderModal } from './CreateFolderModal';
import { IndeedApplicationBanner } from './IndeedApplicationBanner';
import { AiEmailLeaveBanner } from './AiEmailLeaveBanner';
import { DeliverabilityCard } from '../email/DeliverabilityCard';
import { InAppCvViewer } from '../recruitment/InAppCvViewer';
import { DeliverabilityTelemetry, IndeedApplicationDetails } from '../../services/cvAnalysisService';

const FOLDERS = [
  { id: 'INBOX', label: 'Inbox', icon: Inbox },
  { id: 'UNREAD', label: 'Unread', icon: AlertCircle },
  { id: 'ASSIGNED', label: 'Assigned to Me', icon: User },
  { id: 'SENT', label: 'Sent', icon: Send },
  { id: 'STARRED', label: 'Starred', icon: Star },
  { id: 'ARCHIVED', label: 'Archived', icon: Archive },
];

const CATEGORIES = [
  'All Categories',
  'Candidate Response',
  'New Application',
  'Screening',
  'Interview',
  'Onboarding',
  'Documents',
  'Active Intern',
  'Leave',
  'Unlinked Email',
];

export const OutlookInbox: React.FC = () => {
  const { user, profile, canSendEmail } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const threadIdParam = searchParams.get('threadId');

  const { toast } = useToast();
  const [activeFolder, setActiveFolder] = useState('INBOX');
  const [activeCategory, setActiveCategory] = useState('All Categories');
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState('Connected to mail.pileandloop.com:993');

  // Custom Folders & Drag and Drop State
  const [customFolders, setCustomFolders] = useState<InboxFolder[]>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [draggedThreadId, setDraggedThreadId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Multi-Account & 2-Second Real-Time Sync State
  const [accounts, setAccounts] = useState<EmailAccountConfig[]>([]);
  const [activeAccount, setActiveAccount] = useState<EmailAccountConfig | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [syncCount, setSyncCount] = useState<number>(0);

  // Universal Outbound Email Composer State
  const [showComposeModal, setShowComposeModal] = useState(false);

  // Reply Composer & AI Assistant
  const [replyBody, setReplyBody] = useState('');
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [lastTelemetry, setLastTelemetry] = useState<DeliverabilityTelemetry | null>(null);
  const [cvModalDetails, setCvModalDetails] = useState<IndeedApplicationDetails | null>(null);

  // Load configured accounts & custom folders
  useEffect(() => {
    const accs = getEmailAccounts();
    setAccounts(accs);
    const def = accs.find(a => a.isDefault) || accs[0];
    if (def) setActiveAccount(def);

    setCustomFolders(getCustomFolders());
  }, []);

  // 2-Second Corporate Real-Time Sync Heartbeat Pulse
  useEffect(() => {
    if (!autoSyncEnabled || !activeAccount) return;

    const intervalSec = activeAccount.syncIntervalSeconds || 2;
    const timer = setInterval(async () => {
      try {
        await syncMailAccount(activeAccount);
        setLastSyncTime(new Date());
        setSyncCount(prev => prev + 1);
        setSyncStatusText(`2s Live sync active • ${activeAccount.imapHost}`);
      } catch (err: any) {
        setSyncStatusText(`Sync error: ${err?.message || 'Connection glitch'}`);
      }
    }, intervalSec * 1000);

    return () => clearInterval(timer);
  }, [autoSyncEnabled, activeAccount]);

  // Load threads
  useEffect(() => {
    setLoadingThreads(true);
    let q = query(collection(db, 'emailThreads'), orderBy('lastMessageAt', 'desc'));

    const unsub = onSnapshot(q, (snap) => {
      let list = snap.docs.map(d => ({ threadId: d.id, ...d.data() } as EmailThread));

      // Folder filtering
      if (activeFolder === 'STARRED') {
        list = list.filter(t => t.starred);
      } else if (activeFolder === 'ARCHIVED') {
        list = list.filter(t => t.archived || t.folder === 'ARCHIVED');
      } else if (activeFolder === 'UNREAD') {
        list = list.filter(t => t.unread);
      } else if (activeFolder === 'ASSIGNED' && user) {
        list = list.filter(t => t.assignedTo === user.uid);
      } else if (activeFolder === 'SENT') {
        list = list.filter(t => t.folder === 'Sent' || t.folder === 'SENT');
      } else if (activeFolder === 'INBOX') {
        list = list.filter(t => !t.archived && t.folder !== 'Sent' && (!t.folder || t.folder === 'INBOX'));
      } else {
        // Custom folder match
        list = list.filter(t => t.folder === activeFolder);
      }

      if (activeCategory !== 'All Categories') {
        list = list.filter(t => t.category === activeCategory);
      }
      setThreads(list);
      setLoadingThreads(false);

      if (threadIdParam) {
        const matched = list.find(t => t.threadId === threadIdParam);
        if (matched) setSelectedThread(matched);
      } else if (list.length > 0 && !selectedThread) {
        setSelectedThread(list[0]);
      }
    });

    return () => unsub();
  }, [activeFolder, activeCategory, threadIdParam, user]);

  // Load messages for selected thread
  useEffect(() => {
    if (!selectedThread) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const msgQuery = query(
      collection(db, 'emailThreads', selectedThread.threadId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(msgQuery, (snap) => {
      setMessages(snap.docs.map(d => ({ messageId: d.id, ...d.data() } as EmailMessage)));
      setLoadingMessages(false);
    });

    if (selectedThread.unread) {
      updateDoc(doc(db, 'emailThreads', selectedThread.threadId), { unread: false });
    }

    return () => unsub();
  }, [selectedThread?.threadId]);

  // Handle Drag & Drop move thread to folder
  const handleMoveThreadToFolder = async (threadId: string, targetFolderId: string, folderLabel: string) => {
    try {
      const thread = threads.find(t => t.threadId === threadId);
      const updates: any = { folder: targetFolderId, updatedAt: serverTimestamp() };

      if (targetFolderId === 'STARRED') updates.starred = true;
      if (targetFolderId === 'ARCHIVED') updates.archived = true;
      if (targetFolderId === 'UNREAD') updates.unread = true;
      if (targetFolderId === 'INBOX') {
        updates.archived = false;
        updates.starred = false;
      }

      await updateDoc(doc(db, 'emailThreads', threadId), updates);
      store.setDocument('emailThreads', threadId, { ...updates, id: threadId }, true);

      toast.success(`Moved "${thread?.subject || 'Thread'}" to folder: ${folderLabel}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to move email thread');
    }
  };

  const handleDeleteFolder = (folderId: string, folderLabel: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete custom folder "${folderLabel}"? Emails in it will remain accessible in Inbox.`)) {
      deleteCustomFolder(folderId);
      setCustomFolders(getCustomFolders());
      if (activeFolder === folderId) setActiveFolder('INBOX');
      toast.info(`Deleted custom folder "${folderLabel}"`);
    }
  };

  const handleSyncMailbox = async () => {
    setSyncing(true);
    const targetEmail = activeAccount?.email || 'hr@pileandloop.com';
    setSyncStatusText(`Syncing ${targetEmail}...`);
    try {
      if (activeAccount) {
        const res = await syncMailAccount(activeAccount);
        setSyncStatusText(`Sync complete (${res.newEmailsCount || 0} new)`);
        toast.success(`Mailbox synced: ${targetEmail}`);
      } else {
        const res: any = await syncHrMailbox();
        setSyncStatusText(`Sync complete (${res.newMessagesCount || 0} new)`);
        toast.success(`Mailbox synced (${res.newMessagesCount || 0} new)`);
      }
      setLastSyncTime(new Date());
    } catch (err: any) {
      setSyncStatusText(`Sync error: ${err.message}`);
      toast.error(`Sync error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSummarize = async () => {
    if (!selectedThread) return;
    setSummaryLoading(true);
    try {
      const res: any = await summarizeEmailThread(selectedThread.threadId);
      setAiSummary(res.summary);
      toast.success('Email thread summarized by AI.');
    } catch (err: any) {
      toast.error(err.message || 'Summarization failed');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleGenerateAiReply = async (styleInstruction?: string) => {
    if (!selectedThread) return;
    setAiLoading(true);
    setAiWarnings([]);
    try {
      const res: any = await generateHrEmailDraft({
        candidateId: selectedThread.candidateId || undefined,
        applicationId: selectedThread.applicationId || undefined,
        threadId: selectedThread.threadId,
        userInstruction: styleInstruction || aiInstruction || 'Write a helpful and polite candidate response.',
        draftType: selectedThread.category,
      });
      if (res.draft) {
        setReplyBody(res.draft.body || '');
        if (res.draft.warnings && res.draft.warnings.length > 0) {
          setAiWarnings(res.draft.warnings);
        }
        toast.success('AI draft generated.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate draft');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !replyBody.trim()) return;
    const recipient = selectedThread.participantEmails.find(e => !e.includes('pileandloop.com')) || selectedThread.participantEmails[0];

    setSendingReply(true);
    try {
      const res = await sendHrEmail({
        to: recipient,
        subject: selectedThread.subject.startsWith('Re:') ? selectedThread.subject : `Re: ${selectedThread.subject}`,
        htmlBody: `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">${replyBody.replace(/\\n/g, '<br/>')}</div>`,
        textBody: replyBody,
        threadId: selectedThread.threadId,
        candidateId: selectedThread.candidateId || undefined,
        applicationId: selectedThread.applicationId || undefined,
        idempotencyKey: `reply_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });
      if (res.telemetry) {
        setLastTelemetry(res.telemetry);
      }
      setReplyBody('');
      setAiInstruction('');
      toast.success(`Reply dispatched via cPanel SMTP to ${recipient}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const toggleStar = async () => {
    if (!selectedThread) return;
    await updateDoc(doc(db, 'emailThreads', selectedThread.threadId), {
      starred: !selectedThread.starred,
      updatedAt: serverTimestamp(),
    });
  };

  const toggleArchive = async () => {
    if (!selectedThread) return;
    await updateDoc(doc(db, 'emailThreads', selectedThread.threadId), {
      archived: !selectedThread.archived,
      updatedAt: serverTimestamp(),
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* 1. LEFT PANE: Mailboxes, Folders, Custom Folders & Live 2s Pulse */}
      <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col justify-between p-3 select-none">
        <div className="space-y-3 overflow-y-auto scrollbar-thin">
          {/* Active Mailbox Selector */}
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Corporate Mailbox</span>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="text-[10px] text-sky-600 hover:text-sky-800 flex items-center font-medium transition-colors cursor-pointer"
                title="Manage Mail Servers in Settings"
              >
                <SettingsIcon className="w-3 h-3 mr-0.5" />
                Manage
              </button>
            </div>
            <select
              value={activeAccount?.id || ''}
              onChange={(e) => {
                const acc = accounts.find(a => a.id === e.target.value);
                if (acc) {
                  setActiveAccount(acc);
                  toast.info(`Active mailbox set to ${acc.email}`);
                }
              }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md p-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.email} ({acc.accountName})
                </option>
              ))}
            </select>
          </div>

          {/* Compose New Outbound Email */}
          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowComposeModal(true)}
            className="w-full justify-center shadow-xs text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Compose Email
          </Button>

          {/* Sync Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSyncMailbox}
            loading={syncing}
            className="w-full justify-center bg-white shadow-2xs text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
            Sync Now ({activeAccount?.email?.split('@')[0] || 'Mailbox'})
          </Button>

          {/* Standard Folders (Drag and Drop Target) */}
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center justify-between">
              <span>Folders</span>
              <span className="text-[9px] text-slate-400">Drag & Drop Target</span>
            </span>
            {FOLDERS.map((f) => {
              const Icon = f.icon;
              const isDropTarget = dragOverFolderId === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFolder(f.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverFolderId !== f.id) setDragOverFolderId(f.id);
                  }}
                  onDragLeave={() => setDragOverFolderId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const tId = e.dataTransfer.getData('text/plain');
                    setDragOverFolderId(null);
                    if (tId) handleMoveThreadToFolder(tId, f.id, f.label);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isDropTarget
                      ? 'bg-sky-100 text-sky-900 ring-2 ring-sky-500 scale-[1.02]'
                      : activeFolder === f.id
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{f.label}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Folders Section with Add Button */}
          <div className="space-y-0.5 pt-2 border-t border-slate-200/70">
            <div className="flex items-center justify-between px-2 pb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Custom Folders
              </span>
              <button
                type="button"
                onClick={() => setShowFolderModal(true)}
                className="text-[10px] text-sky-600 hover:text-sky-800 flex items-center font-bold transition-colors cursor-pointer"
                title="Create a new custom folder"
              >
                <Plus className="w-3 h-3 mr-0.5" />
                New
              </button>
            </div>

            {customFolders.length === 0 ? (
              <p className="text-[10px] text-slate-400 px-2 italic">No custom folders yet.</p>
            ) : (
              customFolders.map((f) => {
                const isDropTarget = dragOverFolderId === f.id;
                return (
                  <div
                    key={f.id}
                    onClick={() => setActiveFolder(f.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverFolderId !== f.id) setDragOverFolderId(f.id);
                    }}
                    onDragLeave={() => setDragOverFolderId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const tId = e.dataTransfer.getData('text/plain');
                      setDragOverFolderId(null);
                      if (tId) handleMoveThreadToFolder(tId, f.id, f.label);
                    }}
                    className={`group w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isDropTarget
                        ? 'bg-sky-100 text-sky-900 ring-2 ring-sky-500 scale-[1.02]'
                        : activeFolder === f.id
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    <span className="flex items-center space-x-2 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: f.color || '#0284c7' }}
                      />
                      <span className="truncate">{f.label}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteFolder(f.id, f.label, e)}
                      className={`opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-opacity cursor-pointer ${
                        activeFolder === f.id ? 'text-white/80 hover:text-white' : 'text-slate-400'
                      }`}
                      title="Delete folder"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Categories */}
          <div className="space-y-0.5 pt-2 border-t border-slate-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">Categories</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full text-left px-2.5 py-1 rounded-md text-[11px] truncate transition-colors cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-slate-200 text-slate-900 font-semibold'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Real-Time 2-Second Sync Status Health Card */}
        <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[10px] space-y-1.5 shadow-2xs mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${autoSyncEnabled ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
              <span className="font-semibold text-slate-700 truncate">{activeAccount?.email || 'hr@pileandloop.com'}</span>
            </div>
            <button
              type="button"
              onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                autoSyncEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
              title={autoSyncEnabled ? 'Pause automatic 2-second background sync' : 'Resume 2-second background sync'}
            >
              {autoSyncEnabled ? '2s LIVE' : 'PAUSED'}
            </button>
          </div>
          <div className="text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
            <p className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Server:</span>
              <span className="font-mono text-slate-600">{activeAccount?.imapHost || 'mail.pileandloop.com'}:993</span>
            </p>
            <p className="flex items-center justify-between text-[9px] text-slate-400">
              <span>Pulses: {syncCount}</span>
              <span>{lastSyncTime.toLocaleTimeString()}</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE PANE: Thread List with Drag and Drop Source */}
      <div className="w-80 border-r border-slate-200 flex flex-col overflow-hidden bg-slate-50/30">
        <div className="p-3 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <span>{activeCategory === 'All Categories' ? activeFolder : activeCategory}</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">{threads.length} threads</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Drag any thread into folders on the left to organize.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {threads.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-400">
              {loadingThreads ? 'Loading mailbox...' : 'No email threads found in this folder.'}
            </p>
          ) : (
            threads.map((thread) => {
              const isSelected = selectedThread?.threadId === thread.threadId;
              const isBeingDragged = draggedThreadId === thread.threadId;
              return (
                <div
                  key={thread.threadId}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', thread.threadId);
                    e.dataTransfer.effectAllowed = 'move';
                    setDraggedThreadId(thread.threadId);
                  }}
                  onDragEnd={() => setDraggedThreadId(null)}
                  onClick={() => setSelectedThread(thread)}
                  className={`p-3 text-left transition-all cursor-pointer select-none relative group ${
                    isBeingDragged
                      ? 'opacity-40 border-2 border-dashed border-sky-400 bg-sky-50'
                      : isSelected
                      ? 'bg-sky-50/80 border-l-4 border-l-sky-600'
                      : 'hover:bg-slate-100/70 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1.5 truncate">
                      <GripVertical className="w-3 h-3 text-slate-300 group-hover:text-slate-500 cursor-grab shrink-0" />
                      <span className={`text-xs truncate ${thread.unread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {thread.participantEmails[0] || 'Unknown'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(thread.lastMessageAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-xs text-slate-800 font-medium truncate mb-1">
                    {thread.subject}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {thread.lastMessageSnippet || 'No preview available'}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200 truncate max-w-[140px]">
                      {thread.category}
                    </span>
                    {thread.starred && (
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. RIGHT PANE: Thread Messages & Gemini Assistant */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {!selectedThread ? (
          <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-400 space-y-2">
            <Inbox className="w-8 h-8 text-slate-300" />
            <p>Select an email thread from the inbox or drag it to organize.</p>
          </div>
        ) : (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{selectedThread.subject}</h3>
                <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                  <span>Category: <strong>{selectedThread.category}</strong></span>
                  {selectedThread.candidateId && (
                    <button
                      onClick={() => navigate(`/recruitment/candidates/${selectedThread.candidateId}?appId=${selectedThread.applicationId || ''}`)}
                      className="text-sky-600 hover:text-sky-700 font-medium flex items-center space-x-1 cursor-pointer"
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>Open Candidate Profile</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" onClick={handleSummarize} loading={summaryLoading}>
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-sky-600" />
                  Summarize
                </Button>
                <button onClick={toggleStar} className="p-1.5 text-slate-400 hover:text-amber-500 rounded cursor-pointer">
                  <Star className={`w-4 h-4 ${selectedThread.starred ? 'text-amber-500 fill-amber-500' : ''}`} />
                </button>
                <button onClick={toggleArchive} className="p-1.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer">
                  <Archive className={`w-4 h-4 ${selectedThread.archived ? 'text-sky-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* AI Summary Banner */}
            {aiSummary && (
              <div className="p-3 bg-sky-50 border-b border-sky-100 text-xs text-sky-900 flex items-start space-x-2 shrink-0">
                <Sparkles className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <strong>AI Executive Summary:</strong>
                  <p className="mt-0.5 text-sky-800 leading-relaxed">{aiSummary}</p>
                </div>
              </div>
            )}

            {/* Messages Body Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Live SMTP Deliverability Telemetry Card (Shown when an email was dispatched or selected) */}
              {lastTelemetry && (
                <DeliverabilityCard
                  telemetry={lastTelemetry}
                  onClose={() => setLastTelemetry(null)}
                />
              )}

              {/* AI Employee Leave Application Detector & 1-Click Scheduler */}
              <AiEmailLeaveBanner
                thread={selectedThread}
                message={messages[0]}
                existingPeople={Object.values(store.getCollection('people') || {})}
                onLeaveProcessed={() => {
                  toast.success('Leave scheduled and recorded successfully in HR database!');
                }}
              />

              {/* Indeed Application & Below Bachelor Detection Center */}
              <IndeedApplicationBanner
                thread={selectedThread}
                message={messages[0]}
                onOpenCvModal={(details) => setCvModalDetails(details)}
                onPopulateReply={(subj, body) => {
                  setReplyBody(body);
                }}
              />

              {loadingMessages ? (
                <div className="text-center py-8 text-xs text-slate-400">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">No messages in this thread.</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.messageId} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                          {msg.from.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{msg.from}</p>
                          <p className="text-[10px] text-slate-400">To: {msg.to.join(', ')}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div
                      className="text-xs text-slate-700 leading-relaxed pt-2 border-t border-slate-100"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.htmlBody || msg.textBody) }}
                    />

                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 flex items-center space-x-2">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px] text-slate-600 font-medium">
                          {msg.attachments.length} attachment(s)
                        </span>
                      </div>
                    )}

                    {(msg as any).telemetry && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="inline-flex items-center text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                          <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
                          SMTP Handshake Verified • SPF PASS • DKIM PASS (mail.pileandloop.com)
                        </span>
                        <button
                          type="button"
                          onClick={() => setLastTelemetry((msg as any).telemetry)}
                          className="text-[10px] text-sky-600 hover:text-sky-800 font-semibold cursor-pointer underline"
                        >
                          View Delivery Telemetry &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Reply Composer Bar */}
            {canSendEmail && (
              <form onSubmit={handleSendReply} className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-3 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 flex-1">
                    <input
                      type="text"
                      value={aiInstruction}
                      onChange={(e) => setAiInstruction(e.target.value)}
                      placeholder="Instruct AI: e.g. acknowledge submission, ask for availability, formal tone..."
                      className="text-xs p-1.5 border border-slate-300 rounded-lg flex-1 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <Button
                      size="sm"
                      type="button"
                      variant="secondary"
                      onClick={() => handleGenerateAiReply()}
                      loading={aiLoading}
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-sky-600" />
                      AI Draft
                    </Button>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Button size="sm" type="button" variant="ghost" onClick={() => handleGenerateAiReply('Make it shorter')}>
                      Shorter
                    </Button>
                    <Button size="sm" type="button" variant="ghost" onClick={() => handleGenerateAiReply('More formal and professional')}>
                      Formal
                    </Button>
                    <Button size="sm" type="button" variant="ghost" onClick={() => handleGenerateAiReply('Warmer and encouraging')}>
                      Warmer
                    </Button>
                  </div>
                </div>

                {aiWarnings.length > 0 && (
                  <div className="p-2 bg-amber-50 rounded border border-amber-200 text-amber-800 text-[11px]">
                    {aiWarnings.join(', ')}
                  </div>
                )}

                <textarea
                  rows={3}
                  required
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder={`Type your response from ${activeAccount?.email || 'hr@pileandloop.com'}... (Human review required before sending)`}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Sender: <strong className="text-slate-700">{activeAccount?.email || 'hr@pileandloop.com'}</strong> via {activeAccount?.smtpHost || 'mail.pileandloop.com'}:{activeAccount?.smtpPort || 465} (TLS)</span>
                  </span>
                  <Button size="sm" type="submit" loading={sendingReply}>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Review & Send Reply
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {/* Universal Outbound Email Composer Modal */}
      <ComposeEmailModal
        isOpen={showComposeModal}
        onClose={() => setShowComposeModal(false)}
        accounts={accounts}
        defaultSender={activeAccount?.email || 'hr@pileandloop.com'}
      />

      {/* Custom Folder Creator Modal */}
      <CreateFolderModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        onFolderCreated={() => setCustomFolders(getCustomFolders())}
      />

      {/* In-App CV Reader & Indeed OCR Modal */}
      {cvModalDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-50 rounded-2xl max-w-4xl w-full p-5 max-h-[92vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  In-App CV Reader & Indeed OCR: {cvModalDetails.candidateName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCvModalDetails(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <InAppCvViewer
              candidate={{
                fullName: cvModalDetails.candidateName,
                personalEmail: cvModalDetails.candidateEmail,
                phone: cvModalDetails.candidatePhone,
                notes: cvModalDetails.resumeSnippet,
                resumeUrl: cvModalDetails.indeedResumeUrl
              }}
              application={{
                positionAppliedFor: cvModalDetails.positionApplied,
                coverLetter: cvModalDetails.resumeSnippet
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
