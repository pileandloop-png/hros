export interface AttachmentMeta {
  filename: string;
  contentType: string;
  size: number;
  storagePath?: string;
  downloadUrl?: string;
}

export interface EmailMessage {
  messageId: string;
  smtpMessageId: string;
  threadId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  textBody: string;
  htmlBody: string;
  direction: 'INBOUND' | 'OUTBOUND';
  senderUid?: string;
  imapUid?: number;
  attachments?: AttachmentMeta[];
  candidateId?: string | null;
  applicationId?: string | null;
  receivedAt?: any;
  createdAt?: any;
}

export interface EmailThread {
  threadId: string;
  subject: string;
  candidateId?: string | null;
  applicationId?: string | null;
  category: string;
  assignedTo?: string | null;
  participantEmails: string[];
  messageCount: number;
  lastMessageSnippet: string;
  lastMessageAt: any;
  unread: boolean;
  starred: boolean;
  archived: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface AiDraftResponse {
  subject: string;
  body: string;
  recommendedCategory: string;
  suggestedNextAction: string;
  suggestedStage: string | null;
  warnings: string[];
}