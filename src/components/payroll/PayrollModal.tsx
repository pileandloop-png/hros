import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useCompanyProfile } from '../../contexts/CompanyContext';
import { Calculator, DollarSign, Download, Printer, CheckCircle2, Building, Calendar } from 'lucide-react';

interface PayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  department: string;
  role: string;
  baseStipend?: number;
}

export const PayrollModal: React.FC<PayrollModalProps> = ({
  isOpen,
  onClose,
  personName,
  department,
  role,
  baseStipend = 35000
}) => {
  const { company, formatCurrency } = useCompanyProfile();
  const [month, setMonth] = useState('September 2026');
  const [totalWorkingDays, setTotalWorkingDays] = useState(22);
  const [daysPresent, setDaysPresent] = useState(20);
  const [approvedLeaves, setApprovedLeaves] = useState(2);
  const [unexcusedAbsences, setUnexcusedAbsences] = useState(0);
  const [performanceBonus, setPerformanceBonus] = useState(0);

  const dailyRate = Math.round(baseStipend / (totalWorkingDays || 1));
  const effectiveDays = Math.min(totalWorkingDays, daysPresent + approvedLeaves);
  const deductionDays = Math.max(0, totalWorkingDays - effectiveDays);
  const deductionAmount = deductionDays * dailyRate;
  const netPayable = Math.max(0, baseStipend - deductionAmount + Number(performanceBonus || 0));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Stipend & Payroll Voucher (${company.currencyCode})`} maxWidth="md">
      <div className="space-y-4 text-xs">
        
        {/* Input Parameters Form */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div>
              <h4 className="font-bold text-slate-900">{personName}</h4>
              <p className="text-[11px] text-slate-500">{role} • {department} • {company.companyName}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-semibold font-mono text-[11px] border border-emerald-200">
              {formatCurrency(baseStipend)} / mo
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Payroll Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full p-1.5 border rounded bg-white"
              >
                <option value="September 2026">September 2026</option>
                <option value="August 2026">August 2026</option>
                <option value="July 2026">July 2026</option>
                <option value="October 2026">October 2026</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Total Month Working Days</label>
              <input
                type="number"
                value={totalWorkingDays}
                onChange={(e) => setTotalWorkingDays(Number(e.target.value))}
                className="w-full p-1.5 border rounded bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Days Present (Punch Clock)</label>
              <input
                type="number"
                value={daysPresent}
                onChange={(e) => setDaysPresent(Number(e.target.value))}
                className="w-full p-1.5 border rounded bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Approved Paid Leaves</label>
              <input
                type="number"
                value={approvedLeaves}
                onChange={(e) => setApprovedLeaves(Number(e.target.value))}
                className="w-full p-1.5 border rounded bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Unexcused Absences</label>
              <input
                type="number"
                value={unexcusedAbsences}
                onChange={(e) => setUnexcusedAbsences(Number(e.target.value))}
                className="w-full p-1.5 border rounded bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Bonus / Incentive (PKR)</label>
              <input
                type="number"
                value={performanceBonus}
                onChange={(e) => setPerformanceBonus(Number(e.target.value))}
                className="w-full p-1.5 border rounded bg-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Payslip Summary Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 font-mono text-[11px]">
          <div className="flex items-center justify-between text-slate-600">
            <span>Base Stipend:</span>
            <span>{formatCurrency(baseStipend)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Daily Pro-Rata Rate:</span>
            <span>{formatCurrency(dailyRate)} / day</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Effective Paid Days:</span>
            <span>{effectiveDays} of {totalWorkingDays} days</span>
          </div>
          {deductionAmount > 0 && (
            <div className="flex items-center justify-between text-red-600 font-semibold">
              <span>Absence Deductions ({deductionDays} days):</span>
              <span>- {formatCurrency(deductionAmount)}</span>
            </div>
          )}
          {performanceBonus > 0 && (
            <div className="flex items-center justify-between text-emerald-600 font-semibold">
              <span>Performance Bonus:</span>
              <span>+ {formatCurrency(performanceBonus)}</span>
            </div>
          )}

          <div className="border-t-2 border-slate-900 pt-2 flex items-center justify-between text-sm font-bold text-slate-950">
            <span>Net Payable Stipend:</span>
            <span className="text-emerald-700 text-base">{formatCurrency(netPayable)}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>

          <Button size="sm" onClick={() => window.print()} className="bg-sky-600 hover:bg-sky-700 text-white">
            <Printer className="w-3.5 h-3.5 mr-1" />
            Print / Save Payslip PDF
          </Button>
        </div>

      </div>
    </Modal>
  );
};
