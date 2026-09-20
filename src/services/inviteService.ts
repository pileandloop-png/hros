import { store } from './store';
import { sendHrEmail } from './api';

export interface TeamInvite {
  token: string;
  email: string;
  displayName: string;
  role: string;
  department: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED';
  createdAt: string;
  expiresAt: string;
}

export async function createTeamInvite(data: {
  email: string;
  displayName: string;
  role: string;
  department: string;
}): Promise<{ invite: TeamInvite; inviteUrl: string }> {
  const token = 'inv_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days expiration

  const invite: TeamInvite = {
    token,
    email: data.email.trim().toLowerCase(),
    displayName: data.displayName.trim(),
    role: data.role,
    department: data.department,
    status: 'PENDING',
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };

  // Save to persistent store
  store.setDocument('teamInvites', token, invite);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://hros-beryl.vercel.app';
  const inviteUrl = `${baseUrl}/invite?token=${token}`;

  // Dispatch Invitation Email via cPanel SMTP from hr@pileandloop.com
  try {
    await sendHrEmail({
      to: invite.email,
      subject: `You have been invited to join the Pile & Loop Workspace (${invite.role})`,
      idempotencyKey: 'inv-' + token,
      htmlBody: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #0f172a; margin-bottom: 12px;">Welcome to Pile & Loop!</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Hello <strong>${invite.displayName}</strong>,<br/>
            You have been officially invited to join the <strong>Pile & Loop HR Operating System</strong> with the role of <strong>${invite.role}</strong> in the <strong>${invite.department}</strong> department.
          </p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${inviteUrl}" style="background-color: #0284c7; color: #ffffff; padding: 12px 28px; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">
              Accept Invitation & Set Password
            </a>
          </div>
          <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
            Or copy and paste this link into your browser:<br/>
            <a href="${inviteUrl}" style="color: #0284c7;">${inviteUrl}</a>
          </p>
          <p style="color: #94a3b8; font-size: 11px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            This invitation expires in 7 days. If you did not expect this email, please contact hr@pileandloop.com.
          </p>
        </div>
      `,
      textBody: `You have been invited to join Pile & Loop as ${invite.role}. Click here to set up your account: ${inviteUrl}`,
    });
  } catch (err) {
    console.warn('Could not dispatch invite email automatically:', err);
  }

  return { invite, inviteUrl };
}

export function getAllInvites(): TeamInvite[] {
  const collection = store.getCollection('teamInvites');
  return Object.values(collection) as TeamInvite[];
}

export function getInviteByToken(token: string): TeamInvite | null {
  const collection = store.getCollection('teamInvites');
  return (collection[token] as TeamInvite) || null;
}

export function revokeInvite(token: string): boolean {
  const invite = getInviteByToken(token);
  if (!invite) return false;
  store.setDocument('teamInvites', token, { ...invite, status: 'REVOKED' });
  return true;
}

export function acceptInvite(token: string, password: string, displayName?: string): boolean {
  const invite = getInviteByToken(token);
  if (!invite || invite.status !== 'PENDING') return false;

  const now = new Date();
  if (new Date(invite.expiresAt) < now) return false;

  const uid = 'user-' + Date.now().toString(36);
  const newUser = {
    uid,
    id: uid,
    email: invite.email,
    password: password.trim(),
    displayName: displayName || invite.displayName,
    fullName: displayName || invite.displayName,
    role: invite.role,
    department: invite.department,
    status: 'ACTIVE',
    createdAt: now.toISOString(),
  };

  // Save new user to people and users collections
  store.setDocument('people', uid, newUser);
  store.setDocument('users', uid, newUser);

  // Mark invite accepted
  store.setDocument('teamInvites', token, { ...invite, status: 'ACCEPTED' });
  return true;
}
