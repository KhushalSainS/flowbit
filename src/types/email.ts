export type ConnectionType = 'IMAP' | 'GMAIL' | 'OUTLOOK';

export interface EmailConfig {
  id?: string;
  emailAddress: string;
  username?: string | null;
  password?: string | null;
  host?: string | null;
  port?: number | null;
  useSSL: boolean;
  connectionType: ConnectionType;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
