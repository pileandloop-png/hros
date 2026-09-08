import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import { db, FieldValue, Timestamp } from '../config/firebase';

async function performMailboxSync(manualTriggerBy?: string) {
  const host = process.env.HR_IMAP_HOST || 'mail.pileandloop.com';
  const port = parseInt(process.env.HR_IMAP_PORT || '993', 10);
  const secure = process.env.HR_IMAP_SECURE !== 'false';
  const user = process.env.HR_EMAIL_USER || 'hr@pileandloop.com';
  const pass = process.env.HR_EMAIL_PASSWORD;

  const syncStateRef = db.collection('mailSyncState').doc('hr_mailbox');
  const syncDoc = await syncStateRef.get();
  const syncState = syncDoc.data() || { lastProcessedUid: 0, uidValidity: null };

  const client = new ImapFlow({
    host,
    port,
    secure,
    auth: {
      user,
      pass: pass || 'configured_in_secret_manager',
    },
    logger: false,
    tls: {
      rejectUnauthorized: false,
    },
  });

  let newMessagesCount = 0;
  const syncErrors: string[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const status = await client.status('INBOX', { uidValidity: true, messages: true, uidNext: true });
      
      let startUid = 1;
      if (syncState.uidValidity === status.uidValidity && syncState.lastProcessedUid > 0) {
        startUid = syncState.lastProcessedUid + 1;
      }

      const searchRange = `${startUid}:*`;
      const messages = client.fetch(searchRange, { uid: true, envelope: true, source: true });

      let maxUid = syncState.lastProcessedUid || 0;

      for await (const message of messages) {
        if (message.uid <= (syncState.lastProcessedUid || 0)) {
          continue;
        }
        if (message.uid > maxUid) {
          maxUid = message.uid;
        }

        if (!message.source) {
          continue;
        }

        try {
          const parsed = (await simpleParser(message.source)) as ParsedMail;
          const fromAddress = parsed.from?.value[0]?.address || '';
          const normalizedSender = fromAddress.trim().toLowerCase();
          const subject = parsed.subject || '(No Subject)';
          const inReplyTo = parsed.inReplyTo || '';
          const messageIdHeader = parsed.messageId || `<${message.uid}@cpanel.pileandloop.com>`;

          // Deduplication check
          const existingMsg = await db.collectionGroup('messages')
            .where('smtpMessageId', '==', messageIdHeader)
            .limit(1)
            .get();

          if (!existingMsg.empty) {
            continue;
          }

          // Match candidate by normalizedEmail
          let candidateId: string | null = null;
          let applicationId: string | null = null;
          let category = 'Unlinked Email';

          if (normalizedSender) {
            const candidateQuery = await db.collection('candidates')
              .where('normalizedEmail', '==', normalizedSender)
              .limit(1)
              .get();

            if (!candidateQuery.empty) {
              const candidateDoc = candidateQuery.docs[0];
              candidateId = candidateDoc.id;
              category = 'Candidate Response';

              const appQuery = await db.collection('applications')
                .where('candidateId', '==', candidateId)
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();

              if (!appQuery.empty) {
                applicationId = appQuery.docs[0].id;
                await appQuery.docs[0].ref.update({
                  lastCandidateReplyAt: FieldValue.serverTimestamp(),
                  followUpStatus: 'CANDIDATE_RESPONDED',
                });
              }
            }
          }

          // Thread matching
          let matchedThreadId: string | null = null;
          if (inReplyTo) {
            const prevMsgQuery = await db.collectionGroup('messages')
              .where('smtpMessageId', '==', inReplyTo)
              .limit(1)
              .get();

            if (!prevMsgQuery.empty) {
              matchedThreadId = prevMsgQuery.docs[0].data().threadId;
            }
          }

          const attachmentsMeta = (parsed.attachments || []).map((att: any) => ({
            filename: att.filename || 'attachment',
            contentType: att.contentType,
            size: att.size,
            checksum: att.checksum,
          }));

          if (!matchedThreadId) {
            const newThreadRef = db.collection('emailThreads').doc();
            matchedThreadId = newThreadRef.id;
            await newThreadRef.set({
              threadId: matchedThreadId,
              subject,
              candidateId,
              applicationId,
              category,
              assignedTo: null,
              participantEmails: [fromAddress, user],
              messageCount: 1,
              lastMessageSnippet: (parsed.text || '').slice(0, 150),
              lastMessageAt: parsed.date ? Timestamp.fromDate(parsed.date) : FieldValue.serverTimestamp(),
              unread: true,
              starred: false,
              archived: false,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });
          } else {
            await db.collection('emailThreads').doc(matchedThreadId).update({
              messageCount: FieldValue.increment(1),
              lastMessageSnippet: (parsed.text || '').slice(0, 150),
              lastMessageAt: parsed.date ? Timestamp.fromDate(parsed.date) : FieldValue.serverTimestamp(),
              unread: true,
              candidateId: candidateId || undefined,
              applicationId: applicationId || undefined,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }

          // Insert message into subcollection
          const msgRef = db.collection('emailThreads').doc(matchedThreadId).collection('messages').doc();
          await msgRef.set({
            messageId: msgRef.id,
            smtpMessageId: messageIdHeader,
            threadId: matchedThreadId,
            from: fromAddress,
            to: (parsed.to ? (Array.isArray(parsed.to) ? (parsed.to as any[]).map(t => t.text) : [(parsed.to as any).text]) : []),
            cc: [],
            subject,
            textBody: parsed.text || '',
            htmlBody: parsed.html || parsed.textAsHtml || parsed.text || '',
            direction: 'INBOUND',
            imapUid: message.uid,
            receivedAt: parsed.date ? Timestamp.fromDate(parsed.date) : FieldValue.serverTimestamp(),
            attachments: attachmentsMeta,
            candidateId,
            applicationId,
            createdAt: FieldValue.serverTimestamp(),
          });

          // Create notification
          const notifRef = db.collection('notifications').doc();
          await notifRef.set({
            notificationId: notifRef.id,
            userId: 'ALL_HR',
            type: candidateId ? 'NEW_CANDIDATE_REPLY' : 'UNREAD_ASSIGNED_EMAIL',
            title: `New Email from ${fromAddress}`,
            body: subject,
            entityType: 'emailThreads',
            entityId: matchedThreadId,
            read: false,
            createdAt: FieldValue.serverTimestamp(),
          });

          newMessagesCount++;
        } catch (msgErr: any) {
          console.error(`Error processing UID ${message.uid}:`, msgErr);
          syncErrors.push(`UID ${message.uid}: ${msgErr.message}`);
        }
      }

      await syncStateRef.set({
        mailboxId: 'hr_mailbox',
        lastProcessedUid: maxUid,
        uidValidity: status.uidValidity,
        lastSyncAt: FieldValue.serverTimestamp(),
        lastSyncStatus: syncErrors.length === 0 ? 'SUCCESS' : 'PARTIAL_ERRORS',
        newMessagesCount,
        errors: syncErrors.slice(0, 10),
        manualTriggerBy: manualTriggerBy || null,
      }, { merge: true });

    } finally {
      lock.release();
    }
  } catch (err: any) {
    console.error('IMAP sync failed:', err);
    await syncStateRef.set({
      lastSyncAt: FieldValue.serverTimestamp(),
      lastSyncStatus: 'FAILED',
      lastError: err.message,
    }, { merge: true });
    throw err;
  } finally {
    await client.logout();
  }

  return { success: true, newMessagesCount, syncErrors };
}

export const syncHrMailbox = onCall(async (request) => {
  const callerAuth = request.auth;
  if (!callerAuth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  try {
    const result = await performMailboxSync(callerAuth.uid);
    return result;
  } catch (error: any) {
    throw new HttpsError('internal', `Mailbox sync error: ${error.message}`);
  }
});

export const scheduledHrMailboxSync = onSchedule('every 5 minutes', async (event) => {
  try {
    const result = await performMailboxSync('SYSTEM_SCHEDULER');
    console.log('Scheduled IMAP sync complete:', result);
  } catch (err) {
    console.error('Scheduled IMAP sync failed:', err);
  }
});