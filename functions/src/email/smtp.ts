import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as nodemailer from 'nodemailer';
import { db, FieldValue } from '../config/firebase';
import { logAuditEvent } from '../audit/logger';

interface SendMailPayload {
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  textBody?: string;
  htmlBody: string;
  threadId?: string;
  candidateId?: string;
  applicationId?: string;
  category?: string;
  idempotencyKey: string;
}

export const sendHrEmail = onCall(async (request) => {
  const callerAuth = request.auth;
  if (!callerAuth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const callerRole = callerAuth.token.role;
  const authorizedRoles = ['SUPER_ADMIN', 'OWNER', 'HR_SUPERVISOR', 'HR_EXECUTIVE'];
  if (!authorizedRoles.includes(callerRole)) {
    throw new HttpsError('permission-denied', 'Only authorized HR staff can send candidate emails directly.');
  }

  const payload: SendMailPayload = request.data;
  if (!payload.to || !payload.subject || (!payload.htmlBody && !payload.textBody) || !payload.idempotencyKey) {
    throw new HttpsError('invalid-argument', 'Missing required email fields (to, subject, body, or idempotencyKey).');
  }

  // Idempotency check to prevent double-sends
  const existingSend = await db.collection('sentEmailAudit')
    .where('idempotencyKey', '==', payload.idempotencyKey)
    .limit(1)
    .get();

  if (!existingSend.empty) {
    const doc = existingSend.docs[0].data();
    return { success: true, messageId: doc.messageId, cached: true };
  }

  // SMTP Configuration from Secret Manager or environment variables
  const host = process.env.HR_SMTP_HOST || 'mail.pileandloop.com';
  const port = parseInt(process.env.HR_SMTP_PORT || '465', 10);
  const secure = process.env.HR_SMTP_SECURE !== 'false';
  const user = process.env.HR_EMAIL_USER || 'hr@pileandloop.com';
  const pass = process.env.HR_EMAIL_PASSWORD;

  if (!pass) {
    // Check if configured in systemSettings
    const settingsDoc = await db.collection('systemSettings').doc('email').get();
    const settings = settingsDoc.data();
    if (!settings || !settings.smtpConfigured) {
      throw new HttpsError('failed-precondition', 'SMTP credentials not configured. Please set them in Secret Manager or System Settings.');
    }
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass: pass || 'configured_in_secret_manager',
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  let info;
  try {
    info = await transporter.sendMail({
      from: `"Pile & Loop HR" <${user}>`,
      to: payload.to,
      cc: payload.cc,
      bcc: payload.bcc,
      subject: payload.subject,
      text: payload.textBody || payload.htmlBody.replace(/<[^>]*>?/gm, ''),
      html: payload.htmlBody,
    });
  } catch (error: any) {
    console.error('SMTP sending error:', error);
    throw new HttpsError('internal', `Failed to send email via SMTP: ${error.message}`);
  }

  // Store sent record with idempotency
  await db.collection('sentEmailAudit').add({
    idempotencyKey: payload.idempotencyKey,
    messageId: info.messageId,
    to: payload.to,
    subject: payload.subject,
    sentBy: callerAuth.uid,
    sentAt: FieldValue.serverTimestamp(),
    response: info.response || 'OK',
  });

  // Thread management
  let targetThreadId = payload.threadId;
  if (!targetThreadId) {
    const newThreadRef = db.collection('emailThreads').doc();
    targetThreadId = newThreadRef.id;
    await newThreadRef.set({
      threadId: targetThreadId,
      subject: payload.subject,
      candidateId: payload.candidateId || null,
      applicationId: payload.applicationId || null,
      category: payload.category || 'Recruitment',
      assignedTo: callerAuth.uid,
      participantEmails: [payload.to, user],
      messageCount: 1,
      lastMessageSnippet: payload.subject,
      lastMessageAt: FieldValue.serverTimestamp(),
      unread: false,
      starred: false,
      archived: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await db.collection('emailThreads').doc(targetThreadId).update({
      messageCount: FieldValue.increment(1),
      lastMessageSnippet: payload.subject,
      lastMessageAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // Add message to thread subcollection
  const messageRef = db.collection('emailThreads').doc(targetThreadId).collection('messages').doc();
  await messageRef.set({
    messageId: messageRef.id,
    smtpMessageId: info.messageId,
    threadId: targetThreadId,
    from: user,
    to: [payload.to],
    cc: payload.cc || [],
    bcc: payload.bcc || [],
    subject: payload.subject,
    textBody: payload.textBody || '',
    htmlBody: payload.htmlBody,
    direction: 'OUTBOUND',
    senderUid: callerAuth.uid,
    candidateId: payload.candidateId || null,
    applicationId: payload.applicationId || null,
    createdAt: FieldValue.serverTimestamp(),
  });

  // If candidate/application linked, update recruitment communication markers
  if (payload.applicationId) {
    const appRef = db.collection('applications').doc(payload.applicationId);
    const appSnap = await appRef.get();
    if (appSnap.exists) {
      const appData = appSnap.data() || {};
      const updates: Record<string, any> = {
        lastEmailSentAt: FieldValue.serverTimestamp(),
      };
      if (!appData.initialEmailSentAt) {
        updates.initialEmailSentAt = FieldValue.serverTimestamp();
        updates.currentStage = 'INITIAL_EMAIL_SENT';
      }
      await appRef.update(updates);
    }
  }

  await logAuditEvent(
    { uid: callerAuth.uid, name: callerAuth.token.name || callerAuth.token.email, email: callerAuth.token.email || '', role: callerRole },
    'EMAIL_SENT',
    'emailThreads',
    targetThreadId,
    null,
    { to: payload.to, subject: payload.subject, messageId: info.messageId },
    { candidateId: payload.candidateId, applicationId: payload.applicationId }
  );

  return {
    success: true,
    threadId: targetThreadId,
    messageId: info.messageId,
    sentAt: new Date().toISOString(),
  };
});