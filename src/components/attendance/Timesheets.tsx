import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { correctAttendance } from '../../services/api';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { PayrollModal } from '../payroll/PayrollModal';
import { Download, Edit3, Clock, AlertTriangle, Calculator } from 'lucide-react';
import Papa from 'papaparse';

export const Timesheets: React.FC = () => {
  const { isSupervisor } = useAuth();
  const [timesheetData, setTimesheetData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Correction Modal
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [correctedHours, setCorrectedHours] = useState<number>(5);
  const [correctionReason, setCorrectionReason] = useState('');
  const [savingCorrection, setSavingCorrection] = useState(false);

  // Payroll Modal
  const [payrollModalOpen, setPayrollModalOpen] = useState(false);
  const [selectedPersonForPayroll, setSelectedPersonForPayroll] = useState({
    name: 'Saad Qureshi',
    role: 'Software Engineering Intern',
    department: 'Engineering',
    baseStipend: 35000
  });

  const loadTimesheets = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'attendance'), orderBy('dateKey', 'desc'), limit(100)));
      setTimesheetData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimesheets();
  }, []);

  const handleExportCsv = () => {
    const exportRows = timesheetData.map(r => ({
      'Date': r.dateKey,
      'User': r.userName || r.userId,
      'Status': r.status,
      'Worked Hours': (r.netWorkedMinutes / 60).toFixed(2),
      'Break Minutes': r.breakMinutes || 0,
      'Expected Hours': '5.0',
      'Difference (hrs)': ((r.netWorkedMinutes - 300) / 60).toFixed(2),
      'Corrected': r.isCorrected ? 'Yes' : 'No',
      'Tasks Completed': r.tasksCompleted || '',
    }));

    const csv = Papa.unparse(exportRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `timesheets_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || !correctionReason.trim()) return;
    setSavingCorrection(true);
    try {
      await correctAttendance(selectedRecord.id, Math.round(correctedHours * 60), undefined, correctionReason);
      setCorrectionModalOpen(false);
      setCorrectionReason('');
      loadTimesheets();
    } catch (err: any) {
      alert(err.message || 'Correction failed');
    } finally {
      setSavingCorrection(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Attendance Timesheets</h2>
          <p className="text-xs text-slate-500 mt-0.5">Historical work logs, productive hours, and supervisor audit adjustments</p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setPayrollModalOpen(true)}>
            <Calculator className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            Stipend & Payslip Calculator
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportCsv}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export Timesheet CSV
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Date (PKT)</th>
                <th className="p-3">Team Member</th>
                <th className="p-3">Worked Hours</th>
                <th className="p-3">Break</th>
                <th className="p-3">Expected</th>
                <th className="p-3">Status</th>
                <th className="p-3">Tasks Completed</th>
                {isSupervisor && <th className="p-3 text-right">Adjust</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timesheetData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    {loading ? 'Loading timesheet records...' : 'No timesheet entries recorded yet.'}
                  </td>
                </tr>
              ) : (
                timesheetData.map((row) => {
                  const workedHrs = row.netWorkedMinutes ? (row.netWorkedMinutes / 60).toFixed(1) : '0.0';
                  const isUnder = (row.netWorkedMinutes || 0) < 300 && row.status === 'CHECKED_OUT';

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono text-slate-800">{row.dateKey}</td>
                      <td className="p-3 font-semibold text-slate-900">{row.userName}</td>
                      <td className="p-3">
                        <span className={`font-mono font-bold ${isUnder ? 'text-amber-600' : 'text-emerald-700'}`}>
                          {workedHrs}h
                        </span>
                        {row.isCorrected && (
                          <span className="ml-1.5 px-1 py-0.5 rounded bg-amber-50 text-amber-700 text-[9px] border border-amber-200">
                            Corrected
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-500">{row.breakMinutes || 0}m</td>
                      <td className="p-3 font-mono text-slate-400">5.0h</td>
                      <td className="p-3">
                        <Badge variant={row.status === 'CHECKED_OUT' ? 'neutral' : row.status === 'CHECKED_IN' ? 'success' : 'warning'}>
                          {row.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">
                        {row.tasksCompleted || '?'}
                      </td>
                      {isSupervisor && (
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedRecord(row);
                              setCorrectedHours(Number(workedHrs));
                              setCorrectionModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-sky-600 rounded hover:bg-slate-100 cursor-pointer"
                            title="Correct Attendance Hours"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Attendance Adjustment Modal */}
      {selectedRecord && (
        <Modal isOpen={correctionModalOpen} onClose={() => setCorrectionModalOpen(false)} title="Supervisor Attendance Correction" maxWidth="md">
          <form onSubmit={handleSaveCorrection} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>All manual adjustments require an official reason and are permanently recorded in the Audit Log.</span>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Team Member</label>
              <input type="text" disabled value={selectedRecord.userName} className="w-full p-2 border rounded bg-slate-100 font-medium" />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Adjusted Net Worked Hours</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="24"
                required
                value={correctedHours}
                onChange={(e) => setCorrectedHours(Number(e.target.value))}
                className="w-full p-2 border rounded focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Correction Reason *</label>
              <textarea
                rows={2}
                required
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="e.g. Electricity outage in area, verified by supervisor..."
                className="w-full p-2 border rounded focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button size="sm" variant="outline" type="button" onClick={() => setCorrectionModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" loading={savingCorrection}>
                Save & Audit Correction
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Payroll Modal */}
      <PayrollModal
        isOpen={payrollModalOpen}
        onClose={() => setPayrollModalOpen(false)}
        personName={selectedPersonForPayroll.name}
        department={selectedPersonForPayroll.department}
        role={selectedPersonForPayroll.role}
        baseStipend={selectedPersonForPayroll.baseStipend}
      />
    </div>
  );
};
