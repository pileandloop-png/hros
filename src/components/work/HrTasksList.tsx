import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, addDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { WorkTask } from '../../types/workflow';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { CheckSquare, Plus, Check, Clock, AlertCircle } from 'lucide-react';

export const HrTasksList: React.FC = () => {
  const { user, profile, isSupervisor } = useAuth();
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'NORMAL' as const,
    dueAt: '',
  });

  const loadTasks = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'workTasks'), orderBy('createdAt', 'desc')));
      setTasks(snap.docs.map(d => ({ taskId: d.id, ...d.data() } as WorkTask)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'workTasks'), {
        ...newTask,
        status: 'TODO',
        assignedBy: user.uid,
        assignedByName: profile?.displayName || user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setCreateModalOpen(false);
      setNewTask({ title: '', description: '', assignedTo: '', priority: 'NORMAL', dueAt: '' });
      loadTasks();
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    }
  };

  const handleToggleStatus = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
    await updateDoc(doc(db, 'workTasks', taskId), {
      status: nextStatus,
      completedAt: nextStatus === 'DONE' ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    });
    setTasks(prev => prev.map(t => t.taskId === taskId ? { ...t, status: nextStatus as any } : t));
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Internal HR Team Tasks</h2>
          <p className="text-xs text-slate-500 mt-0.5">Coordinate applicant reviews, interview calls, and onboarding duties</p>
        </div>
        <Button size="sm" onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add HR Task
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100">
        {tasks.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-400">
            {loading ? 'Loading tasks...' : 'No HR tasks active.'}
          </p>
        ) : (
          tasks.map((task) => (
            <div key={task.taskId} className="p-4 flex items-start justify-between text-xs hover:bg-slate-50/60">
              <div className="flex items-start space-x-3">
                <button
                  onClick={() => handleToggleStatus(task.taskId, task.status)}
                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${
                    task.status === 'DONE' ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-300 bg-white hover:border-slate-400'
                  }`}
                >
                  {task.status === 'DONE' && <Check className="w-3 h-3" />}
                </button>
                <div>
                  <h4 className={`font-semibold ${task.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {task.title}
                  </h4>
                  {task.description && <p className="text-slate-500 mt-0.5">{task.description}</p>}
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                    Created by {task.assignedByName || 'HR Staff'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge variant={task.priority === 'URGENT' ? 'danger' : task.priority === 'HIGH' ? 'warning' : 'neutral'}>
                  {task.priority}
                </Badge>
                <Badge variant={task.status === 'DONE' ? 'success' : 'default'}>
                  {task.status}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Task Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create Internal HR Task" maxWidth="md">
        <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Task Title *</label>
            <input
              type="text"
              required
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="e.g. Screen graphic design CV batch..."
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Priority</label>
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
              className="w-full p-2 border rounded bg-white"
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Description / Notes</label>
            <textarea
              rows={2}
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button size="sm" type="submit">Create Task</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
