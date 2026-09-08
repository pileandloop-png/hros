import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, FieldValue } from '../config/firebase';
import { logAuditEvent } from '../audit/logger';

interface RawCsvRow {
  'Application ID'?: string;
  'Date Entered'?: string;
  'Candidate Name'?: string;
  'Personal Email'?: string;
  'Phone Number'?: string;
  'City'?: string;
  'Position Applied For'?: string;
  'Stage'?: string;
  'First Email Sent By'?: string;
  'Follow-Up 1 Sent On'?: string;
  'Follow-Up 2 Sent On'?: string;
  'Previous Education'?: string;
  'CV / Application Source'?: string;
  'Key Candidate Factor'?: string;
  'Notes by HR'?: string;
  'Notes by Owner'?: string;
  'CV Preview / Link'?: string;
  'Contact Key'?: string;
  'Candidate History'?: string;
  'Previous / Other Application'?: string;
  'Follow-Up Status'?: string;
  'Contact Completeness %'?: string;
  'Matching Row'?: string;
  [key: string]: any;
}

function normalizeEmail(email?: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

function normalizePhone(phone?: string): string {
  if (!phone) return '';
  // Remove non-digit characters
  return phone.replace(/\D/g, '');
}

export const importCandidateCsv = onCall(async (request) => {
  const callerAuth = request.auth;
  if (!callerAuth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { rows, isDryRun, defaultVacancyId } = request.data as {
    rows: RawCsvRow[];
    isDryRun: boolean;
    defaultVacancyId?: string;
  };

  if (!rows || !Array.isArray(rows)) {
    throw new HttpsError('invalid-argument', 'Valid array of rows is required.');
  }

  const result = {
    totalRows: rows.length,
    validRows: 0,
    createdCandidates: 0,
    createdApplications: 0,
    matchedExistingCandidates: 0,
    duplicateReviewNeeded: 0,
    skippedRows: 0,
    warnings: [] as string[],
    duplicateItems: [] as any[],
  };

  // Map to hold in-memory cache during this import run
  const emailToCandidateIdMap = new Map<string, string>();
  const phoneToCandidateIdMap = new Map<string, string>();

  // Fetch existing candidates to map
  const existingCandidatesSnap = await db.collection('candidates').get();
  for (const doc of existingCandidatesSnap.docs) {
    const data = doc.data();
    if (data.normalizedEmail) emailToCandidateIdMap.set(data.normalizedEmail, doc.id);
    if (data.normalizedPhone) phoneToCandidateIdMap.set(data.normalizedPhone, doc.id);
  }

  const batchList: FirebaseFirestore.WriteBatch[] = [db.batch()];
  let currentBatchOpCount = 0;

  function addBatchOp(op: (batch: FirebaseFirestore.WriteBatch) => void) {
    if (currentBatchOpCount >= 450) {
      batchList.push(db.batch());
      currentBatchOpCount = 0;
    }
    const currentBatch = batchList[batchList.length - 1];
    op(currentBatch);
    currentBatchOpCount++;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawEmail = row['Personal Email'] || '';
    const rawPhone = row['Phone Number'] || '';
    const fullName = (row['Candidate Name'] || '').trim();
    const position = row['Position Applied For'] || 'General Internship';
    const legacyAppId = row['Application ID'] || `LEGACY-${i + 1}`;

    const normalizedEmailVal = normalizeEmail(rawEmail);
    const normalizedPhoneVal = normalizePhone(rawPhone);

    if (!fullName && !normalizedEmailVal && !normalizedPhoneVal) {
      result.skippedRows++;
      result.warnings.push(`Row ${i + 1}: Empty candidate name and contact info. Skipped.`);
      continue;
    }

    result.validRows++;

    // Duplicate Check
    let candidateId = emailToCandidateIdMap.get(normalizedEmailVal);

    if (!candidateId && normalizedPhoneVal && phoneToCandidateIdMap.has(normalizedPhoneVal)) {
      // Phone matched but email differed -> Uncertain match, queue for review!
      result.duplicateReviewNeeded++;
      const reviewItem = {
        rowNumber: i + 1,
        fullName,
        normalizedEmail: normalizedEmailVal,
        normalizedPhone: normalizedPhoneVal,
        matchedCandidateId: phoneToCandidateIdMap.get(normalizedPhoneVal),
        reason: 'Phone matches existing candidate with different email address.',
        rowData: row,
      };
      result.duplicateItems.push(reviewItem);

      if (!isDryRun) {
        const reviewRef = db.collection('duplicateReview').doc();
        addBatchOp(b => b.set(reviewRef, {
          reviewId: reviewRef.id,
          ...reviewItem,
          status: 'PENDING',
          createdAt: FieldValue.serverTimestamp(),
        }));
      }
      continue;
    }

    if (candidateId) {
      result.matchedExistingCandidates++;
    } else {
      // Create new Candidate ID
      const candidateRef = db.collection('candidates').doc();
      candidateId = candidateRef.id;

      if (normalizedEmailVal) emailToCandidateIdMap.set(normalizedEmailVal, candidateId);
      if (normalizedPhoneVal) phoneToCandidateIdMap.set(normalizedPhoneVal, candidateId);
      result.createdCandidates++;

      if (!isDryRun) {
        addBatchOp(b => b.set(candidateRef, {
          candidateId,
          fullName: fullName || 'Unnamed Candidate',
          personalEmail: rawEmail,
          normalizedEmail: normalizedEmailVal,
          phone: rawPhone,
          normalizedPhone: normalizedPhoneVal,
          city: row['City'] || '',
          education: row['Previous Education'] || '',
          cvLink: row['CV Preview / Link'] || '',
          candidateTags: [position, row['CV / Application Source'] || 'Legacy Tracker'],
          rawLegacyData: row,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }));
      }
    }

    // Now create Application entity
    const appRef = db.collection('applications').doc();
    result.createdApplications++;

    if (!isDryRun) {
      addBatchOp(b => b.set(appRef, {
        applicationId: appRef.id,
        legacyApplicationId: legacyAppId,
        candidateId,
        vacancyId: defaultVacancyId || 'LEGACY_IMPORT',
        positionAppliedFor: position,
        source: row['CV / Application Source'] || 'Indeed',
        currentStage: mapLegacyStage(row['Stage']),
        keyCandidateFactor: row['Key Candidate Factor'] || '',
        hrNotes: row['Notes by HR'] || '',
        ownerNotes: row['Notes by Owner'] || '',
        followUpStatus: row['Follow-Up Status'] || 'NONE',
        firstEmailSentBy: row['First Email Sent By'] || '',
        followUp1SentOn: row['Follow-Up 1 Sent On'] || '',
        followUp2SentOn: row['Follow-Up 2 Sent On'] || '',
        cvDocumentId: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }));

      // Append initial stage history entry
      const histRef = appRef.collection('stageHistory').doc();
      addBatchOp(b => b.set(histRef, {
        historyId: histRef.id,
        stage: mapLegacyStage(row['Stage']),
        changedFrom: null,
        changedBy: callerAuth.uid,
        reason: 'Imported from Legacy Tracker spreadsheet',
        changedAt: FieldValue.serverTimestamp(),
      }));
    }
  }

  // If not dry run, commit all batches
  if (!isDryRun) {
    for (const batch of batchList) {
      await batch.commit();
    }

    // Log audit event
    await logAuditEvent(
      { uid: callerAuth.uid, name: callerAuth.token.name || 'Admin', email: callerAuth.token.email || '', role: callerAuth.token.role },
      'CSV_IMPORTED',
      'candidates',
      'batch_import',
      null,
      result,
      { isDryRun: false }
    );
  }

  return { success: true, isDryRun, result };
});

function mapLegacyStage(legacyStage?: string): string {
  if (!legacyStage) return 'NEW_APPLICATION';
  const s = legacyStage.toUpperCase().trim();
  if (s.includes('INTERVIEW')) return 'INTERVIEW_SCHEDULED';
  if (s.includes('SCREENING') || s.includes('QUESTION')) return 'SCREENING_QUESTIONS_SENT';
  if (s.includes('FIRST EMAIL') || s.includes('CONTACTED')) return 'INITIAL_EMAIL_SENT';
  if (s.includes('SELECTED') || s.includes('OFFER')) return 'SELECTED';
  if (s.includes('ONBOARD')) return 'ONBOARDING_DOCUMENTS_PENDING';
  if (s.includes('REJECT') || s.includes('NOT HIRED')) return 'NOT_HIRED';
  if (s.includes('WITHDRAW')) return 'WITHDRAWN';
  return 'NEW_APPLICATION';
}

export const reviewDuplicateCandidate = onCall(async (request) => {
  const callerAuth = request.auth;
  if (!callerAuth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { reviewId, action, targetCandidateId } = request.data as {
    reviewId: string;
    action: 'MERGE' | 'KEEP_SEPARATE' | 'IGNORE';
    targetCandidateId?: string;
  };

  const reviewDocRef = db.collection('duplicateReview').doc(reviewId);
  const snap = await reviewDocRef.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Duplicate review item not found.');
  }

  const reviewData = snap.data()!;
  const row = reviewData.rowData;

  if (action === 'MERGE' && targetCandidateId) {
    // Create Application under existing target candidate
    const appRef = db.collection('applications').doc();
    await appRef.set({
      applicationId: appRef.id,
      candidateId: targetCandidateId,
      positionAppliedFor: row['Position Applied For'] || 'General Internship',
      source: row['CV / Application Source'] || 'Duplicate Review Merged',
      currentStage: mapLegacyStage(row['Stage']),
      hrNotes: row['Notes by HR'] || '',
      ownerNotes: row['Notes by Owner'] || '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else if (action === 'KEEP_SEPARATE') {
    // Create new Candidate and new Application
    const candRef = db.collection('candidates').doc();
    await candRef.set({
      candidateId: candRef.id,
      fullName: reviewData.fullName,
      personalEmail: reviewData.normalizedEmail,
      normalizedEmail: reviewData.normalizedEmail,
      phone: reviewData.normalizedPhone,
      normalizedPhone: reviewData.normalizedPhone,
      rawLegacyData: row,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const appRef = db.collection('applications').doc();
    await appRef.set({
      applicationId: appRef.id,
      candidateId: candRef.id,
      positionAppliedFor: row['Position Applied For'] || 'General Internship',
      currentStage: mapLegacyStage(row['Stage']),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await reviewDocRef.update({
    status: action,
    resolvedBy: callerAuth.uid,
    resolvedAt: FieldValue.serverTimestamp(),
  });

  return { success: true, message: `Duplicate item ${reviewId} marked as ${action}` };
});