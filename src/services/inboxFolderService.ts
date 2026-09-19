import { store } from './store';

export interface InboxFolder {
  id: string;
  label: string;
  iconName?: string;
  color?: string;
  isCustom?: boolean;
  count?: number;
}

const STORAGE_KEY = 'hros_inbox_custom_folders_v1';

export const DEFAULT_INBOX_FOLDERS: InboxFolder[] = [
  { id: 'INBOX', label: 'Inbox', iconName: 'Inbox', isCustom: false },
  { id: 'UNREAD', label: 'Unread', iconName: 'AlertCircle', isCustom: false },
  { id: 'ASSIGNED', label: 'Assigned to Me', iconName: 'User', isCustom: false },
  { id: 'SENT', label: 'Sent', iconName: 'Send', isCustom: false },
  { id: 'STARRED', label: 'Starred', iconName: 'Star', isCustom: false },
  { id: 'ARCHIVED', label: 'Archived', iconName: 'Archive', isCustom: false },
];

export function getCustomFolders(): InboxFolder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load custom folders:', err);
  }

  // Pre-seed with useful HR folders
  const seeded: InboxFolder[] = [
    { id: 'folder_interviews', label: 'Interviews Scheduled', color: '#0284c7', isCustom: true },
    { id: 'folder_shortlisted', label: 'Shortlisted Talent', color: '#10b981', isCustom: true },
    { id: 'folder_offers', label: 'Offer Letters Sent', color: '#8b5cf6', isCustom: true },
    { id: 'folder_urgent', label: 'Urgent Action', color: '#ef4444', isCustom: true },
  ];
  saveCustomFolders(seeded);
  return seeded;
}

export function saveCustomFolders(folders: InboxFolder[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
  } catch (err) {
    console.error('Failed to persist custom folders:', err);
  }
}

export function addCustomFolder(label: string, color: string = '#0284c7'): InboxFolder {
  const folders = getCustomFolders();
  const id = 'folder_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const newFolder: InboxFolder = {
    id,
    label: label.trim(),
    color,
    isCustom: true
  };
  folders.push(newFolder);
  saveCustomFolders(folders);
  return newFolder;
}

export function deleteCustomFolder(id: string): boolean {
  const folders = getCustomFolders();
  const filtered = folders.filter(f => f.id !== id);
  if (filtered.length !== folders.length) {
    saveCustomFolders(filtered);
    return true;
  }
  return false;
}
