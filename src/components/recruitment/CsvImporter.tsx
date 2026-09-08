import React, { useState } from 'react';
import Papa from 'papaparse';
import { importCandidateCsv } from '../../services/api';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet, ArrowRight, ShieldCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CsvImporter: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [finalResult, setFinalResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError('');

      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data.length === 0) {
            setError('The selected CSV file contains no records.');
            return;
          }
          setParsedRows(results.data);
          setHeaders(results.meta.fields || []);
          setStep(2);
        },
        error: (err) => {
          setError(`CSV Parsing error: ${err.message}`);
        },
      });
    }
  };

  // Step 3: Run Dry-Run Analysis
  const handleRunDryRun = async () => {
    setLoading(true);
    setError('');
    try {
      const res: any = await importCandidateCsv(parsedRows, true);
      setDryRunResult(res.result);
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Dry run analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Execute Real Import Batch
  const handleExecuteImport = async () => {
    setLoading(true);
    setError('');
    try {
      const res: any = await importCandidateCsv(parsedRows, false);
      setFinalResult(res.result);
      setStep(5);
    } catch (err: any) {
      setError(err.message || 'Import execution failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Legacy Candidate Tracker CSV Migration</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Safely import Pile & Loop candidates and applications with deduplication and validation
        </p>
      </div>

      {/* Stepper Wizard Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs font-semibold">
        {[
          { num: 1, label: 'Upload' },
          { num: 2, label: 'Inspect Rows' },
          { num: 3, label: 'Mapping' },
          { num: 4, label: 'Dry Run Preview' },
          { num: 5, label: 'Complete' },
        ].map((s) => (
          <div key={s.num} className="flex items-center space-x-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
              step >= s.num ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-400'
            }`}>
              {s.num}
            </span>
            <span className={step >= s.num ? 'text-slate-800' : 'text-slate-400'}>{s.label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Upload */}
      {step === 1 && (
        <div className="bg-white p-12 rounded-xl border-2 border-dashed border-slate-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Upload Existing HR Tracker Spreadsheet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Select the exported CSV file containing legacy candidate applications and follow-ups.
            </p>
          </div>
          <label className="inline-block cursor-pointer">
            <span className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm">
              Browse CSV File
            </span>
            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      )}

      {/* STEP 2: Inspect Rows */}
      {step === 2 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">CSV Structure Validated</h3>
            <Badge variant="success">{parsedRows.length} Rows Found</Badge>
          </div>
          <p className="text-xs text-slate-600">
            Detected {headers.length} columns: {headers.slice(0, 8).join(', ')}...
          </p>

          <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Position</th>
                  <th className="p-2">Stage</th>
                  <th className="p-2">City</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedRows.slice(0, 5).map((row, idx) => (
                  <tr key={idx}>
                    <td className="p-2 font-medium">{row['Candidate Name']}</td>
                    <td className="p-2 font-mono text-slate-500">{row['Personal Email']}</td>
                    <td className="p-2">{row['Position Applied For']}</td>
                    <td className="p-2">{row['Stage']}</td>
                    <td className="p-2 text-slate-400">{row['City'] || '?'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
              Choose Different File
            </Button>
            <Button size="sm" onClick={() => setStep(3)}>
              Proceed to Field Mapping
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Field Mapping Confirmation */}
      {step === 3 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900">Field Mapping Verification</h3>
          <p className="text-slate-500">
            The system automatically normalizes candidate emails, phones, and maps legacy stage names.
          </p>

          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <span className="font-semibold text-slate-700">Primary Deduplication Key:</span>
              <p className="text-slate-500 font-mono mt-0.5">normalized personal email (lowercased, trimmed)</p>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Secondary Deduplication Key:</span>
              <p className="text-slate-500 font-mono mt-0.5">normalized phone (digits only)</p>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Application Entity:</span>
              <p className="text-slate-500 mt-0.5">Created separately per vacancy application</p>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Uncertain Matches:</span>
              <p className="text-slate-500 mt-0.5">Queued in Duplicate Review Queue for human decision</p>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button size="sm" onClick={handleRunDryRun} loading={loading}>
              Run Dry-Run Analysis
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Dry-Run Preview Results */}
      {step === 4 && dryRunResult && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900">Dry-Run Simulation Results</h3>
          <p className="text-slate-500">
            Dry run completed without writing to the database. Review the projected outcome:
          </p>

          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-lg border">
              <span className="text-slate-400 block text-[10px]">Total Parsed</span>
              <strong className="text-lg text-slate-900">{dryRunResult.totalRows}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border">
              <span className="text-slate-400 block text-[10px]">New Candidates</span>
              <strong className="text-lg text-emerald-600">{dryRunResult.createdCandidates}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border">
              <span className="text-slate-400 block text-[10px]">New Applications</span>
              <strong className="text-lg text-sky-600">{dryRunResult.createdApplications}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border">
              <span className="text-slate-400 block text-[10px]">Uncertain Duplicates</span>
              <strong className="text-lg text-amber-600">{dryRunResult.duplicateReviewNeeded}</strong>
            </div>
          </div>

          {dryRunResult.warnings && dryRunResult.warnings.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-1">
              <h5 className="font-semibold text-amber-800">Warnings:</h5>
              {dryRunResult.warnings.slice(0, 5).map((w: string, idx: number) => (
                <p key={idx} className="text-amber-700 text-[11px]">? {w}</p>
              ))}
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button size="sm" variant="success" onClick={handleExecuteImport} loading={loading}>
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Confirm & Execute Batch Import
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: Completed */}
      {step === 5 && finalResult && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-2xs text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Import Batch Successfully Committed!</h3>
            <p className="text-xs text-slate-500 mt-1">
              Imported {finalResult.createdCandidates} candidate records and {finalResult.createdApplications} applications.
            </p>
          </div>

          <div className="flex justify-center space-x-3 pt-4">
            <Button size="sm" onClick={() => navigate('/recruitment/applications')}>
              View Applications Table
            </Button>
            {finalResult.duplicateReviewNeeded > 0 && (
              <Button size="sm" variant="outline" onClick={() => navigate('/recruitment/duplicates')}>
                Review Duplicates ({finalResult.duplicateReviewNeeded})
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
