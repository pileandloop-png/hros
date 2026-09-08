import { db, FieldValue } from '../config/firebase';

export interface AuditActor {
  uid: string;
  name: string;
  email: string;
  role: string;
}

export async function logAuditEvent(
  actor: AuditActor,
  action: string,
  entityType: string,
  entityId: string,
  before: any = null,
  after: any = null,
  metadata: Record<string, any> = {}
) {
  try {
    const auditRef = db.collection('auditLogs').doc();
    await auditRef.set({
      auditId: auditRef.id,
      actorUid: actor.uid,
      actorName: actor.name || actor.email,
      actorRole: actor.role || 'UNKNOWN',
      action,
      entityType,
      entityId,
      before: before ?? null,
      after: after ?? null,
      metadata: metadata || {},
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to write audit log entry:', error);
  }
}