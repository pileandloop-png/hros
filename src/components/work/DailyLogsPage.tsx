import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, addDoc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { DailyLog } from '../../types/workflow';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Plus, CheckCircle, Clock, Link as LinkIcon } from 'lucide-react';

export const DailyLogsPage: React.FC = () => {
  const { user, profile, isSupervisor, isTeamMemberOnly } = useAuth();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newLog, setNewLog] = useState({
    dateKey: new Date().toISOString().split('T')[0],
    tasks: '',
    timeSpentMinutes: 300,
    deliverableLinks: '',
    notes: '',
  });

  const loadLogs = async () => {
    setLoading(true);
    try {
      let q = query(collection(db, 'dailyLogs'), orderBy('createdAt', 'desc'));
      if (isTeamMemberOnly && user) {
        q = query(collection(db, 'dailyLogs'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
      }
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ logId: d.id, ...d.data() } as DailyLog)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [user, isTeamMemberOnly]);

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'dailyLogs'), {
        userId: user.uid,
        userName: profile?.displayName || user.email,
        dateKey: newLog.dateKey,
        tasks: newLog.tasks,
        timeSpentMinutes: Number(newLog.timeSpentMinutes),
        deliverableLinks: newLog.deliverableLinks,
        notes: newLog.notes,
        status: 'SUBMITTED',
        createdAt: serverTimestamp(),
      });
      setModalOpen(false);
      setNewLog({ dateKey: new Date().toISOString().split('T')[0], tasks: '', timeSpentMinutes: 300, deliverableLinks: '', notes: '' });
      loadLogs();
    } catch (err: any) {
      alert(err.message || 'Failed to save daily log');
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Daily Work Logs</h2>
          <p className="text-xs text-slate-500 mt-0.5">Track daily task execution, deliverables, and productive hours</p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Log Daily Work
        </Button>
      </div>

      <div className="space-y-3">
        {logs.length === 0 ? (
          <div className="p-8 bg-white rounded-xl border border-dashed text-center text-xs text-slate-400">
            {loading ? 'Loading daily logs...' : 'No daily logs recorded yet.'}
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.logId} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 font-mono">{log.dateKey}</span>
                  <Badge variant="info">{(log.timeSpentMinutes / 60).toFixed(1)} hrs</Badge>
                </div>
                <Badge variant="success">{log.status}</Badge>
              </div>

              <p className="text-slate-700 whitespace-pre-line leading-relaxed">{log.tasks}</p>

              {log.deliverableLinks && (
                <div className="pt-2 flex items-center space-x-1 text-sky-600 font-mono text-[11px]">
                  <LinkIcon className="w-3 h-3" />
                  <a href={log.deliverableLinks} target="_blank" rel="noreferrer" className="hover:underline truncate max-w-md">
                    {log.deliverableLinks}
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Submit Daily Work Log" maxWidth="md">
        <form onSubmit={handleCreateLog} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Date</label>
              <input
                type="date"
                required
                value={newLog.dateKey}
                onChange={(e) => setNewLog({ ...newLog, dateKey: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Time Spent (Minutes)</label>
              <input
                type="number"
                required
                value={newLog.timeSpentMinutes}
                onChange={(e) => setNewLog({ ...newLog, timeSpentMinutes: Number(e.target.value) })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Tasks Completed Today *</label>
            <textarea
              rows={3}
              required
              value={newLog.tasks}
              onChange={(e) => setNewLog({ ...newLog, tasks: e.target.value })}
              placeholder="List completed deliverables and design tasks..."
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Deliverable Links (Drive, Figma, GitHub)</label>
            <input
              type="text"
              value={newLog.deliverableLinks}
              onChange={(e) => setNewLog({ ...newLog, deliverableLinks: e.target.value })}
              placeholder="https://..."
              className="w-full p-2 border rounded font-mono"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button size="sm" type="submit">Submit Work Log</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
