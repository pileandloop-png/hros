import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { AuditLogEntry } from '../../types/workflow';
import { Badge } from '../common/Badge';
import { ShieldCheck, Search, Filter } from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(150)));
      setLogs(snap.docs.map(d => ({ auditId: d.id, ...d.data() } as AuditLogEntry)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const filteredLogs = logs.filter(l =>
    !search ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.actorName.toLowerCase().includes(search.toLowerCase()) ||
    l.entityType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Security & Operational Audit Trail</h2>
          <p className="text-xs text-slate-500 mt-0.5">Immutable audit record of all administrative, recruitment, and attendance mutations</p>
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action or actor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 select-none">
              <tr>
                <th className="p-3">Timestamp (PKT)</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Role</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entity</th>
                <th className="p-3">Details / Mutation Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-sans text-xs">
                    {loading ? 'Loading audit trail...' : 'No audit entries found.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.auditId} className="hover:bg-slate-50/80 font-sans">
                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                      {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : 'Recent'}
                    </td>
                    <td className="p-3 font-semibold text-slate-800">{log.actorName}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-sky-700">{log.action}</td>
                    <td className="p-3 text-slate-600 font-mono text-[11px]">{log.entityType}</td>
                    <td className="p-3 text-slate-500 max-w-sm truncate text-[11px]">
                      {log.metadata?.action || (log.after ? JSON.stringify(log.after) : '?')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
