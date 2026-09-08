import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db, FieldValue, Timestamp } from '../config/firebase';

export const scheduledInternshipEndAlerts = onSchedule('every day 09:00', async (event) => {
  const now = new Date();
  const activeInternsSnap = await db.collection('people')
    .where('status', '==', 'ACTIVE')
    .where('workerType', '==', 'INTERN')
    .get();

  for (const doc of activeInternsSnap.docs) {
    const data = doc.data();
    if (!data.expectedEndDate) continue;

    const endDate = (data.expectedEndDate as Timestamp).toDate();
    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let alertTitle = '';
    if (diffDays === 30) {
      alertTitle = `30 Days Remaining: Internship for ${data.fullName}`;
    } else if (diffDays === 14) {
      alertTitle = `14 Days Remaining: Internship for ${data.fullName}`;
    } else if (diffDays === 7) {
      alertTitle = `1 Week Remaining: Internship for ${data.fullName}`;
    } else if (diffDays === 1) {
      alertTitle = `Final Day Tomorrow: Internship for ${data.fullName}`;
    }

    if (alertTitle) {
      const notifRef = db.collection('notifications').doc();
      await notifRef.set({
        notificationId: notifRef.id,
        userId: 'ALL_HR',
        type: 'INTERNSHIP_ENDING',
        title: alertTitle,
        body: `${data.fullName} (${data.jobTitle}) expected end date is ${endDate.toLocaleDateString()}. Please prepare the offboarding checklist and performance evaluation.`,
        entityType: 'people',
        entityId: doc.id,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  }
});

export const scheduledHrAlerts = onSchedule('every day 10:00', async (event) => {
  // Check for follow-up candidates needing action (3 days after initial email without response)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const pendingApps = await db.collection('applications')
    .where('currentStage', '==', 'INITIAL_EMAIL_SENT')
    .where('followUpStatus', '==', 'NONE')
    .limit(50)
    .get();

  for (const doc of pendingApps.docs) {
    const data = doc.data();
    if (data.initialEmailSentAt) {
      const sentDate = (data.initialEmailSentAt as Timestamp).toDate();
      if (sentDate < threeDaysAgo) {
        // Create follow-up reminder
        const notifRef = db.collection('notifications').doc();
        await notifRef.set({
          notificationId: notifRef.id,
          userId: data.assignedHRUserIds?.[0] || 'ALL_HR',
          type: 'FOLLOW_UP_DUE',
          title: `Follow-Up 1 Due: ${data.positionAppliedFor}`,
          body: `Candidate has not responded after 3 days. Ready for Follow-Up 1.`,
          entityType: 'applications',
          entityId: doc.id,
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    }
  }
});