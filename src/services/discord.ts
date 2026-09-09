import { store } from './store';

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title: string;
  description?: string;
  color?: number; // e.g. 0x0284c7 (sky), 0x10b981 (emerald), 0xf59e0b (amber)
  fields?: DiscordEmbedField[];
  footer?: { text: string };
  timestamp?: string;
}

export function getDiscordWebhookUrl(): string {
  try {
    const saved = localStorage.getItem('hros_discord_webhook');
    if (saved) return saved.trim();
    const settings = store.getCollection('settings')?.discord;
    return settings?.webhookUrl || '';
  } catch {
    return '';
  }
}

export function setDiscordWebhookUrl(url: string) {
  try {
    localStorage.setItem('hros_discord_webhook', url.trim());
    store.setDocument('settings', 'discord', { webhookUrl: url.trim(), updatedAt: new Date().toISOString() });
  } catch (e) {
    console.warn('Failed to save Discord webhook:', e);
  }
}

export async function sendDiscordWebhook(embed: DiscordEmbed): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = getDiscordWebhookUrl();
  if (!webhookUrl) {
    return { success: false, error: 'No Discord webhook URL configured.' };
  }

  const payload = {
    username: 'Pile & Loop HROS',
    avatar_url: 'https://hros-beryl.vercel.app/logo.svg',
    embeds: [
      {
        ...embed,
        color: embed.color || 0x0284c7,
        footer: embed.footer || { text: 'Pile & Loop HR System • Lahore, Pakistan' },
        timestamp: embed.timestamp || new Date().toISOString()
      }
    ]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `Discord HTTP error (${response.status}): ${errText}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to dispatch Discord webhook.' };
  }
}

// Pre-built Alert Helpers
export async function notifyDiscordNewCandidate(candidateName: string, vacancyTitle: string, email: string, source: string = 'Careers Portal') {
  return sendDiscordWebhook({
    title: '🎯 New Candidate Application Received',
    description: `A new candidate has submitted an application on the **${source}**.`,
    color: 0x0284c7, // Sky Blue
    fields: [
      { name: 'Candidate Name', value: candidateName, inline: true },
      { name: 'Position', value: vacancyTitle, inline: true },
      { name: 'Email', value: email, inline: true },
      { name: 'Pipeline Stage', value: '`NEW_APPLIED`', inline: true },
      { name: 'Action', value: '[Review Candidate in Kanban](https://hros-beryl.vercel.app/recruitment/pipeline)', inline: false }
    ]
  });
}

export async function notifyDiscordAccessRequest(applicantName: string, email: string, requestedRole: string, department: string) {
  return sendDiscordWebhook({
    title: '🛡️ New Account Sign-Up Request',
    description: `A new user has registered and is awaiting Super Admin role allocation.`,
    color: 0xf59e0b, // Amber
    fields: [
      { name: 'Applicant', value: applicantName, inline: true },
      { name: 'Email', value: email, inline: true },
      { name: 'Department', value: department, inline: true },
      { name: 'Requested Role', value: requestedRole, inline: true },
      { name: 'Approval Required', value: '[Review & Allocate Role in Settings](https://hros-beryl.vercel.app/settings)', inline: false }
    ]
  });
}

export async function notifyDiscordAttendancePunch(userName: string, punchType: 'CHECK_IN' | 'CHECK_OUT', timeStr: string, netHours?: string) {
  const isCheckIn = punchType === 'CHECK_IN';
  return sendDiscordWebhook({
    title: isCheckIn ? '🟢 Team Member Clocked In' : '🔴 Team Member Clocked Out',
    description: `${userName} has recorded daily attendance in **Asia/Karachi (PKT)**.`,
    color: isCheckIn ? 0x10b981 : 0x64748b, // Emerald / Slate
    fields: [
      { name: 'Team Member', value: userName, inline: true },
      { name: 'Time (PKT)', value: timeStr, inline: true },
      ...(netHours ? [{ name: 'Total Working Time', value: `${netHours} hrs`, inline: true }] : [])
    ]
  });
}

export async function notifyDiscordLeaveRequest(userName: string, leaveType: string, daysCount: number, reason: string) {
  return sendDiscordWebhook({
    title: '📅 New Leave Request Submitted',
    description: `${userName} has applied for time off.`,
    color: 0x8b5cf6, // Purple
    fields: [
      { name: 'Applicant', value: userName, inline: true },
      { name: 'Leave Type', value: leaveType, inline: true },
      { name: 'Duration', value: `${daysCount} Day(s)`, inline: true },
      { name: 'Reason', value: reason || 'Not specified', inline: false }
    ]
  });
}
