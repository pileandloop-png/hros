import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, orderBy, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { syncHrMailbox, sendHrEmail, generateHrEmailDraft, summarizeEmailThread } from '../../services/api';
import { EmailThread, EmailMessage } from '../../types/email';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
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
  FileCheck
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

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

  const [activeFolder, setActiveFolder] = useState('INBOX');
  const [activeCategory, setActiveCategory] = useState('All Categories');
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState('Connected to cPanel IMAP');

  // Reply Composer & AI Assistant
  const [replyBody, setReplyBody] = useState('');
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);

  // Load threads
  useEffect(() => {
    setLoadingThreads(true);
    let q = query(collection(db, 'emailThreads'), orderBy('lastMessageAt', 'desc'));
    if (activeFolder === 'STARRED') {
      q = query(collection(db, 'emailThreads'), where('starred', '==', true), orderBy('lastMessageAt', 'desc'));
    } else if (activeFolder === 'ARCHIVED') {
      q = query(collection(db, 'emailThreads'), where('archived', '==', true), orderBy('lastMessageAt', 'desc'));
    }

    const unsub = onSnapshot(q, (snap) => {
      let list = snap.docs.map(d => ({ threadId: d.id, ...d.data() } as EmailThread));
      if (activeFolder === 'UNREAD') {
        list = list.filter(t => t.unread);
      } else if (activeFolder === 'ASSIGNED' && user) {
        list = list.filter(t => t.assignedTo === user.uid);
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
  }, [activeFolder, activeCategory, threadIdParam]);

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

    // Mark as read
    if (selectedThread.unread) {
      updateDoc(doc(db, 'emailThreads', selectedThread.threadId), { unread: false });
    }

    return () => unsub();
  }, [selectedThread?.threadId]);

  const handleSyncMailbox = async () => {
    setSyncing(true);
    setSyncStatusText('Syncing with cPanel...');
    try {
      const res: any = await syncHrMailbox();
      setSyncStatusText(`Sync complete (${res.newMessagesCount || 0} new)`);
    } catch (err: any) {
      setSyncStatusText(`Sync error: ${err.message}`);
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
    } catch (err: any) {
      alert(err.message || 'Summarization failed');
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
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate draft');
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
      await sendHrEmail({
        to: recipient,
        subject: selectedThread.subject.startsWith('Re:') ? selectedThread.subject : `Re: ${selectedThread.subject}`,
        htmlBody: `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">${replyBody.replace(/\n/g, '<br/>')}</div>`,
        textBody: replyBody,
        threadId: selectedThread.threadId,
        candidateId: selectedThread.candidateId || undefined,
        applicationId: selectedThread.applicationId || undefined,
        idempotencyKey: `reply_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });
      setReplyBody('');
      setAiInstruction('');
      alert('Reply dispatched via cPanel SMTP.');
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
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
      {/* 1. LEFT PANE: Folders & Categories & Mailbox Health */}
      <div className="w-56 bg-slate-50 border-r border-slate-200 flex flex-col justify-between p-3 select-none">
        <div className="space-y-4">
          {/* Sync Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSyncMailbox}
            loading={syncing}
            className="w-full justify-center bg-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
            Sync Mailbox
          </Button>

          {/* Mail Folders */}
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">Folders</span>
            {FOLDERS.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFolder(f.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    activeFolder === f.id
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

          {/* Categories */}
          <div className="space-y-0.5">
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

        {/* Mailbox Status Health Indicator */}
        <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[10px] text-slate-500 space-y-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700">hr@pileandloop.com</span>
          </div>
          <p className="truncate">{syncStatusText}</p>
        </div>
      </div>

      {/* 2. MIDDLE PANE: Thread List */}
      <div className="w-80 border-r border-slate-200 flex flex-col overflow-hidden bg-slate-50/30">
        <div className="p-3 border-b border-slate-200 bg-white">
          <h3 className="text-xs font-bold text-slate-800 flex items-center justify-between">
            <span>{activeCategory === 'All Categories' ? activeFolder : activeCategory}</span>
            <span className="text-[10px] text-slate-400 font-mono">{threads.length} threads</span>
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {threads.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-400">
              {loadingThreads ? 'Loading mailbox...' : 'No email threads found.'}
            </p>
          ) : (
            threads.map((thread) => {
              const isSelected = selectedThread?.threadId === thread.threadId;
              return (
                <div
                  key={thread.threadId}
                  onClick={() => setSelectedThread(thread)}
                  className={`p-3 transition-colors cursor-pointer select-none space-y-1 ${
                    isSelected ? 'bg-sky-50/80 border-l-4 border-sky-600' : 'hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`truncate ${thread.unread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                      {thread.participantEmails[0]}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {thread.lastMessageAt?.toDate ? thread.lastMessageAt.toDate().toLocaleDateString() : 'Today'}
                    </span>
                  </div>

                  <h5 className={`text-xs truncate ${thread.unread ? 'font-bold text-slate-900' : 'text-slate-800'}`}>
                    {thread.subject}
                  </h5>

                  <p className="text-[11px] text-slate-500 truncate line-clamp-1">
                    {thread.lastMessageSnippet}
                  </p>

                  <div className="flex items-center space-x-1.5 pt-1">
                    <Badge variant={thread.category.includes('Response') ? 'success' : thread.category.includes('Unlinked') ? 'warning' : 'neutral'}>
                      {thread.category}
                    </Badge>
                    {thread.candidateId && (
                      <span className="text-[9px] text-sky-600 font-semibold uppercase">Linked</span>
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
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
            Select an email thread from the inbox to read and reply.
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
                <button onClick={toggleArchive} className="p-1.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer">
                  <Archive className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* AI Summary Banner if generated */}
            {aiSummary && (
              <div className="p-4 bg-sky-50/80 border-b border-sky-100 text-xs text-sky-900 space-y-1">
                <div className="flex justify-between items-center font-semibold">
                  <span className="flex items-center"><Sparkles className="w-3.5 h-3.5 mr-1 text-sky-600" /> AI Conversation Summary:</span>
                  <button onClick={() => setAiSummary(null)} className="text-sky-500 hover:text-sky-800 text-[10px]">Dismiss</button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <p>? <strong>Inquiry:</strong> {aiSummary['1. Reason candidate contacted us'] || aiSummary.inquiry || 'Inquiry'}</p>
                  <p>? <strong>Answers:</strong> {aiSummary['2. Important candidate answers / qualifications stated'] || 'Provided'}</p>
                  <p>? <strong>Next Step:</strong> {aiSummary['6. Recommended next administrative action'] || 'Reply'}</p>
                </div>
              </div>
            )}

            {/* Messages Scroll View */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.messageId}
                  className={`p-4 rounded-xl border space-y-2 text-xs ${
                    msg.direction === 'OUTBOUND'
                      ? 'bg-slate-50 border-slate-200 ml-8'
                      : 'bg-white border-slate-200 shadow-2xs mr-8'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[11px]">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{msg.from}</span>
                      <Badge variant={msg.direction === 'OUTBOUND' ? 'info' : 'neutral'}>
                        {msg.direction}
                      </Badge>
                    </div>
                    <span className="text-slate-400 font-mono">
                      {msg.receivedAt?.toDate ? msg.receivedAt.toDate().toLocaleString() : msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString() : 'Recent'}
                    </span>
                  </div>

                  {/* Sanitized Message Body (DOMPurify to prevent XSS) */}
                  <div
                    className="prose prose-xs max-w-none text-slate-800 leading-relaxed font-sans"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.htmlBody || msg.textBody || '') }}
                  />

                  {/* Attachments Section */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 flex items-center">
                        <Paperclip className="w-3 h-3 mr-1" />
                        Attachments ({msg.attachments.length}):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {msg.attachments.map((att, aIdx) => (
                          <div key={aIdx} className="px-2.5 py-1 bg-slate-100 rounded border border-slate-200 text-[11px] text-slate-700 flex items-center space-x-1">
                            <span>{att.filename}</span>
                            <span className="text-slate-400 font-mono">({Math.round(att.size / 1024)} KB)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Reply Composer & AI Drafting Bar */}
            {canSendEmail && (
              <form onSubmit={handleSendReply} className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-3 shrink-0">
                {/* AI Assistant Quick Controls */}
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
                  placeholder="Type your response from hr@pileandloop.com... (Human review required before sending)"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Sender: hr@pileandloop.com via SMTP</span>
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
    </div>
  );
};
