import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { reviewDuplicateCandidate } from '../../services/api';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { GitMerge, UserPlus, Check, AlertTriangle } from 'lucide-react';

export const DuplicateReviewQueue: React.FC = () => {
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'duplicateReview'), where('status', '==', 'PENDING')));
      setReviewItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error loading duplicate queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleAction = async (reviewId: string, action: 'MERGE' | 'KEEP_SEPARATE' | 'IGNORE', targetCandidateId?: string) => {
    setActionLoading(reviewId);
    try {
      await reviewDuplicateCandidate(reviewId, action, targetCandidateId);
      setReviewItems(prev => prev.filter(item => item.id !== reviewId));
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Duplicate Review Queue</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Review potential duplicate candidates detected during CSV import or recruitment intake
        </p>
      </div>

      {reviewItems.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
          {loading ? 'Checking duplicate review queue...' : 'No pending duplicate candidates to review. All records are resolved.'}
        </div>
      ) : (
        <div className="space-y-3">
          {reviewItems.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{item.fullName}</h4>
                  <p className="text-slate-500 mt-0.5">
                    Email: <span className="font-mono text-slate-700">{item.normalizedEmail || '?'}</span> ? Phone: <span className="font-mono text-slate-700">{item.normalizedPhone || '?'}</span>
                  </p>
                </div>
                <Badge variant="warning">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Uncertain Match
                </Badge>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px]">
                <strong>Match Reason:</strong> {item.reason}
                {item.matchedCandidateId && (
                  <span className="block mt-0.5 text-amber-700 font-mono">Matched Existing Candidate ID: {item.matchedCandidateId}</span>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading === item.id}
                  onClick={() => handleAction(item.id, 'IGNORE')}
                >
                  Ignore
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={actionLoading === item.id}
                  onClick={() => handleAction(item.id, 'KEEP_SEPARATE')}
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  Keep as Separate Candidate
                </Button>
                {item.matchedCandidateId && (
                  <Button
                    size="sm"
                    variant="primary"
                    loading={actionLoading === item.id}
                    onClick={() => handleAction(item.id, 'MERGE', item.matchedCandidateId)}
                  >
                    <GitMerge className="w-3.5 h-3.5 mr-1" />
                    Merge Under Existing Candidate
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
