export type ConnectionType = 'IMAP' | 'GMAIL' | 'OUTLOOK';

export interface EmailConfig {
  id: string;
  emailAddress: string;
  connectionType: ConnectionType;
  username: string;
  password: string;
  host?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailMetadata {
  id: string;
  configId: string;
  fromAddress: string;
  subject: string;
  dateReceived: Date;
  attachmentFileName: string;
}

export interface ProcessedEmail {
  fileName: string;
  fromAddress: string;
  subject: string;
  dateReceived: Date;
}
