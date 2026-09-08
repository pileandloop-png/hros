import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Bell, CheckCheck, Clock, Mail, UserCheck, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', 'in', [user.uid, 'ALL_HR']),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const handleMarkAsRead = async (notifId: string) => {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = async () => {
    for (const n of notifications.filter(n => !n.read)) {
      await updateDoc(doc(db, 'notifications', n.id), { read: true });
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Notifications Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">Automated reminders, candidate emails, and internship alerts</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleMarkAllRead}>
          <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
          Mark All as Read
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <p className="p-12 text-center text-xs text-slate-400">
            {loading ? 'Loading notifications...' : 'No notifications received.'}
          </p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-start justify-between text-xs transition-colors ${
                n.read ? 'bg-white' : 'bg-sky-50/40 font-medium'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${n.type.includes('INTERNSHIP') ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                  {n.type.includes('EMAIL') ? <Mail className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{n.title}</h4>
                  <p className="text-slate-600 mt-0.5">{n.body}</p>
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                    {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : 'Recent'}
                  </span>
                </div>
              </div>

              {!n.read && (
                <Button size="sm" variant="ghost" onClick={() => handleMarkAsRead(n.id)}>
                  Mark Read
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
