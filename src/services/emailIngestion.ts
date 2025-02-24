import { PrismaClient } from '@prisma/client';
import { simpleParser, ParsedMail, Attachment } from 'mailparser';
import { promises as fs } from 'fs';
import path from 'path';
import Imap from 'imap';
import type { Box } from 'imap';
import { Stream } from 'stream';
import { prisma } from '@/lib/prisma';
import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { gmail_v1 } from 'googleapis/build/src/apis/gmail/v1';

type EmailConfig = {
  id: string;
  username?: string | null;
  emailAddress: string;
  password: string | null;
  host: string | null;
  port: number | null;
  useSSL: boolean;
  connectionType: 'GMAIL' | 'OUTLOOK' | 'IMAP';
};

class TokenCredentialAuthProvider implements AuthenticationProvider {
  constructor(private credential: ClientSecretCredential, private scopes: string[]) {}

  async getAccessToken(): Promise<string> {
    const token = await this.credential.getToken(this.scopes);
    return token.token;
  }
}

interface GmailMessagePart {
  mimeType: string;
  filename?: string;
  body?: {
    attachmentId?: string;
  };
}

interface GmailMessageHeader {
  name: string;
  value: string;
}

interface AttachmentData {
  filename: string;
  content: Buffer;
  contentType: string;
  related?: boolean;
  type?: string;
  contentDisposition?: string;
  headers?: Record<string, string>;
}

export class EmailIngestionService {
  private async setupIMAP(config: EmailConfig): Promise<Imap> {
    return new Imap({
      user: config.username || config.emailAddress,
      password: config.password!,
      host: config.host || 'imap.gmail.com',
      port: config.port || 993,
      tls: config.useSSL,
      tlsOptions: {
        rejectUnauthorized: false,  // Allow self-signed certificates
        servername: config.host || 'imap.gmail.com'
      },
    });
  }

  async testConnection(config: EmailConfig): Promise<boolean> {
    const imap = await this.setupIMAP(config);
    
    return new Promise((resolve, reject) => {
      imap.once('ready', () => {
        imap.end();
        resolve(true);
      });

      imap.once('error', (err: Error) => {
        reject(err);
      });

      imap.connect();
    });
  }

  async processEmails(config: EmailConfig) {
    switch (config.connectionType) {
      case 'GMAIL':
        await this.processGmailEmails(config);
        break;
      case 'OUTLOOK':
        await this.processOutlookEmails(config);
        break;
      case 'IMAP':
        await this.processImapEmails(config);
        break;
      default:
        throw new Error('Unsupported connection type');
    }
  }

  private async processGmailEmails(config: EmailConfig) {
    try {
      const auth = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI
      );
      
      if (!config.password) {
        throw new Error('Gmail refresh token not found');
      }
  
      auth.setCredentials({ refresh_token: config.password });
      const gmail = google.gmail({ version: 'v1', auth });
  
      try {
        const res = await gmail.users.messages.list({
          userId: 'me',
          q: 'has:attachment filename:pdf',
          maxResults: 100
        });
  
        if (!res.data.messages || res.data.messages.length === 0) {
          console.log('No messages found with PDF attachments');
          return;
        }
  
        for (const message of res.data.messages) {
          try {
            const email = await gmail.users.messages.get({
              userId: 'me',
              id: message.id!,
              format: 'full'
            });
    
            // Process attachments
            const attachments = email.data.payload?.parts?.filter(
              (part: gmail_v1.Schema$MessagePart) => 
                part.mimeType === 'application/pdf'
            );
    
            if (attachments) {
              for (const attachment of attachments) {
                const att = await gmail.users.messages.attachments.get({
                  userId: 'me',
                  messageId: message.id!,
                  id: attachment.body?.attachmentId!
                });
    
                if (att.data.data) {
                  const attachmentData: AttachmentData = {
                    filename: attachment.filename!,
                    content: Buffer.from(att.data.data, 'base64'),
                    contentType: 'application/pdf',
                    related: false,
                    type: 'attachment',
                    contentDisposition: 'attachment',
                    headers: {}
                  };
    
                  const headers = email.data.payload?.headers;
                  const fromHeader = headers?.find(
                    (h: gmail_v1.Schema$MessagePartHeader) => h.name === 'From'
                  )?.value || '';
                  const subjectHeader = headers?.find(
                    (h: gmail_v1.Schema$MessagePartHeader) => h.name === 'Subject'
                  )?.value || '';
    
                  await this.savePDFAttachment(
                    config.id,
                    attachmentData,
                    fromHeader,
                    subjectHeader,
                    new Date(parseInt(email.data.internalDate!))
                  );
                }
              }
            }
          } catch (messageError) {
            console.error(`Error processing message ${message.id}:`, messageError);
            continue;
          }
        }
      } catch (gmailError) {
        const errorMessage = gmailError instanceof Error ? gmailError.message : 'Unknown error';
        throw new Error(`Gmail API error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Failed to process Gmail emails:', error);
      throw error;
    }
  }

  private async processOutlookEmails(config: EmailConfig) {
    const credential = new ClientSecretCredential(
      process.env.AZURE_TENANT_ID!,
      process.env.AZURE_CLIENT_ID!,
      process.env.AZURE_CLIENT_SECRET!
    );

    const authProvider = new TokenCredentialAuthProvider(credential, [
      'https://graph.microsoft.com/.default'
    ]);

    const client = Client.initWithMiddleware({
      authProvider: authProvider
    });

    const messages = await client.api('/me/messages')
      .filter("hasAttachments eq true")
      .select('subject,from,receivedDateTime,attachments')
      .get();

    for (const message of messages.value) {
      const attachments = message.attachments.filter(
        (att: any) => att.contentType === 'application/pdf'
      );

      for (const attachment of attachments) {
        const response = await client.api(`/me/messages/${message.id}/attachments/${attachment.id}/$value`)
          .get();

        const attachmentData: AttachmentData = {
          filename: attachment.name,
          content: Buffer.from(response),
          contentType: 'application/pdf',
          related: false,
          type: 'attachment',
          contentDisposition: 'attachment',
          headers: {}
        };

        await this.savePDFAttachment(
          config.id,
          attachmentData,
          message.from.emailAddress.address,
          message.subject,
          new Date(message.receivedDateTime)
        );
      }
    }
  }

  private async processImapEmails(config: EmailConfig) {
    const imap = await this.setupIMAP(config);
    
    imap.once('ready', () => {
      imap.openBox('INBOX', false, async (err: Error | null, box: Box) => {
        if (err) throw err;

        imap.search(['UNSEEN'], async (err: Error | null, results: number[]) => {
          if (err) throw err;

          const f = imap.fetch(results, { bodies: '', struct: true });

          f.on('message', (msg, seqno) => {
            msg.on('body', async (stream: Stream) => {
              try {
                const parsed: ParsedMail = await simpleParser(stream);
                
                if (parsed.attachments && parsed.attachments.length > 0) {
                  for (const attachment of parsed.attachments) {
                    if (attachment.contentType === 'application/pdf' && attachment.filename) {
                      const attachmentData: AttachmentData = {
                        filename: attachment.filename,
                        content: attachment.content,
                        contentType: attachment.contentType,
                        related: attachment.related,
                        contentDisposition: attachment.contentDisposition,
                        headers: Object.fromEntries(
                          Array.from(attachment.headers?.entries() || [])
                            .map(([key, value]) => [key, value.toString()])
                        )
                      };
                      
                      await this.savePDFAttachment(
                        config.id,
                        attachmentData,
                        parsed.from?.text || '',
                        parsed.subject || '',
                        parsed.date || new Date()
                      );
                    }
                  }
                }
              } catch (error) {
                console.error('Error processing email:', error);
              }
            });
          });
        });
      });
    });

    imap.connect();
  }

  private async savePDFAttachment(
    configId: string,
    attachment: AttachmentData,
    fromAddress: string,
    subject: string,
    dateReceived: Date
  ) {
    const pdfDir = path.join(process.cwd(), 'pdfs');
    await fs.mkdir(pdfDir, { recursive: true });

    const fileName = `${Date.now()}-${attachment.filename}`;
    const filePath = path.join(pdfDir, fileName);

    await fs.writeFile(filePath, attachment.content);

    await prisma.pDFAttachment.create({
      data: {
        configId,
        fromAddress,
        subject,
        dateReceived,
        fileName,
        localPath: filePath,
      },
    });
  }
}
