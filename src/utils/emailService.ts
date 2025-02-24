import { prisma } from '@/lib/prisma'
import { EmailConfig, ProcessedEmail } from '@/types/email';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import fs from 'fs';
import path from 'path';
import fsPromises from 'fs/promises';

interface ImapError extends Error {
  source?: string;
}

export class EmailService {
  private async saveAttachment(buffer: Buffer, fileName: string): Promise<string> {
    const pdfDir = path.join(process.cwd(), 'public', 'pdfs');
    
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const uniqueFileName = `${Date.now()}-${fileName}`;
    const filePath = path.join(pdfDir, uniqueFileName);
    
    fs.writeFileSync(filePath, buffer);
    return uniqueFileName;
  }

  private async processEmailMetadata(
    config: EmailConfig,
    fromAddress: string,
    subject: string,
    dateReceived: Date,
    fileName: string
  ): Promise<void> {
    // Check if this email is already processed
    const existing = await prisma.emailMetadata.findFirst({
      where: {
        configId: config.id,
        fromAddress,
        subject,
        dateReceived,
      }
    });

    if (!existing) {
      await prisma.emailMetadata.create({
        data: {
          configId: config.id,
          fromAddress,
          subject,
          dateReceived,
          attachmentFileName: fileName
        }
      });
    }
  }

  private async handleImapConnection(config: EmailConfig): Promise<ProcessedEmail[]> {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: config.username,
        password: config.password || '',
        host: config.host || '',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      });

      const processedEmails: ProcessedEmail[] = [];

      imap.once('ready', () => {
        imap.openBox('INBOX', false, async (error, box) => {
          if (error) {
            reject(error);
            return;
          }

          // Search for unread messages with attachments
          imap.search(['UNSEEN', ['HEADER', 'content-type', 'application/pdf']], async (error, results) => {
            if (error) {
              reject(error);
              return;
            }

            if (!results.length) {
              imap.end();
              resolve(processedEmails);
              return;
            }

            const fetch = imap.fetch(results, {
              bodies: '',
              markSeen: true,
              struct: true
            });

            fetch.on('message', (msg) => {
              const email: any = {};
              let attachments: any[] = [];

              msg.on('body', async (stream) => {
                try {
                  const parsed = await simpleParser(stream);
                  email.from = parsed.from?.text || '';
                  email.subject = parsed.subject || '';
                  email.date = parsed.date || new Date();

                  // Process attachments
                  if (parsed.attachments) {
                    for (const attachment of parsed.attachments) {
                      if (attachment.contentType === 'application/pdf') {
                        try {
                          const fileName = await this.saveAttachment(
                            attachment.content,
                            attachment.filename || 'unnamed.pdf'
                          );

                          await this.processEmailMetadata(
                            config,
                            email.from,
                            email.subject,
                            email.date,
                            fileName
                          );

                          processedEmails.push({
                            fileName,
                            fromAddress: email.from,
                            subject: email.subject,
                            dateReceived: email.date
                          });
                        } catch (error) {
                          console.error('Error processing attachment:', error);
                        }
                      }
                    }
                  }
                } catch (error) {
                  console.error('Error parsing email:', error);
                }
              });

              msg.once('error', (error) => {
                console.error('Error processing message:', error);
              });
            });

            fetch.once('error', (error) => {
              reject(error);
            });

            fetch.once('end', () => {
              imap.end();
              resolve(processedEmails);
            });
          });
        });
      });

      imap.once('error', (error: ImapError) => {
        reject(error);
      });

      imap.once('end', () => {
        console.log('IMAP connection ended');
      });

      imap.connect();
    });
  }

  private async handleGmailConnection(config: EmailConfig): Promise<ProcessedEmail[]> {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: config.password // Using password field to store refresh token
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const processedEmails: ProcessedEmail[] = [];

    try {
      // Get messages with PDF attachments
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'has:attachment filename:pdf',
        maxResults: 10
      });

      const messages = response.data.messages || [];

      for (const message of messages) {
        try {
          const email = await gmail.users.messages.get({
            userId: 'me',
            id: message.id!,
            format: 'full'
          });

          const headers = email.data.payload?.headers;
          const from = headers?.find(h => h.name === 'From')?.value || '';
          const subject = headers?.find(h => h.name === 'Subject')?.value || '';
          const date = new Date(parseInt(email.data.internalDate!));

          // Find PDF attachments
          const parts = this.findPdfAttachments(email.data.payload!);

          for (const part of parts) {
            const attachment = await gmail.users.messages.attachments.get({
              userId: 'me',
              messageId: message.id!,
              id: part.body!.attachmentId!
            });

            if (attachment.data.data) {
              const fileName = await this.saveAttachment(
                Buffer.from(attachment.data.data, 'base64'),
                part.filename || 'unnamed.pdf'
              );

              await this.processEmailMetadata(
                config,
                from,
                subject,
                date,
                fileName
              );

              processedEmails.push({
                fileName,
                fromAddress: from,
                subject,
                dateReceived: date
              });
            }
          }

          // Mark message as read
          await gmail.users.messages.modify({
            userId: 'me',
            id: message.id!,
            requestBody: {
              removeLabelIds: ['UNREAD']
            }
          });
        } catch (error) {
          console.error(`Error processing message ${message.id}:`, error);
          continue; // Continue with next message if one fails
        }
      }

      return processedEmails;
    } catch (error) {
      console.error('Gmail fetch error:', error);
      throw error;
    }
  }

  private findPdfAttachments(payload: any): any[] {
    const attachments: any[] = [];
    const traverse = (part: any) => {
      if (part.mimeType === 'application/pdf' && part.body?.attachmentId) {
        attachments.push(part);
      }
      if (part.parts) {
        part.parts.forEach(traverse);
      }
    };
    traverse(payload);
    return attachments;
  }

  async fetchEmails(config: EmailConfig): Promise<ProcessedEmail[]> {
    try {
      switch (config.connectionType) {
        case 'IMAP':
          return await this.handleImapConnection(config);
        case 'GMAIL':
          return await this.handleGmailConnection(config);
        case 'OUTLOOK':
          // Implement Outlook fetching
          throw new Error('Outlook fetching not implemented yet');
        default:
          throw new Error(`Unsupported connection type: ${config.connectionType}`);
      }
    } catch (error) {
      console.error(`Error fetching emails for ${config.connectionType}:`, error);
      throw error;
    }
  }
} 