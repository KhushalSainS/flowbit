import { EmailConfig, ProcessedEmail } from '@/types/email';
import { prisma } from '@/lib/prisma';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import path from 'path';
import fs from 'fs/promises';

export class EmailService {
  private async saveAttachment(buffer: Buffer, fileName: string): Promise<string> {
    const pdfDir = path.join(process.cwd(), 'public', 'pdfs');
    await fs.mkdir(pdfDir, { recursive: true });

    const uniqueFileName = `${Date.now()}-${fileName}`;
    const filePath = path.join(pdfDir, uniqueFileName);
    
    await fs.writeFile(filePath, buffer);
    return uniqueFileName;
  }

  private async processEmailMetadata(
    config: EmailConfig,
    fromAddress: string,
    subject: string,
    dateReceived: Date,
    fileName: string
  ) {
    await prisma.emailMetadata.create({
      data: {
        configId: config.id,
        fromAddress,
        subject,
        dateReceived,
        attachmentFileName: fileName,
      }
    });
  }

  private async handleImapConnection(config: EmailConfig): Promise<ProcessedEmail[]> {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: config.username,
        password: config.password,
        host: config.host || 'imap.gmail.com',
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

          imap.search(['UNSEEN'], async (error, results) => {
            if (error) {
              reject(error);
              return;
            }

            if (!results.length) {
              imap.end();
              resolve(processedEmails);
              return;
            }

            const fetch = imap.fetch(results, { bodies: '', markSeen: true });

            fetch.on('message', (msg) => {
              let buffer = '';
              msg.on('body', (stream) => {
                stream.on('data', (chunk) => {
                  buffer += chunk.toString('utf8');
                });

                stream.once('end', async () => {
                  try {
                    const parsed = await simpleParser(buffer);
                    
                    if (parsed.attachments) {
                      for (const attachment of parsed.attachments) {
                        if (attachment.contentType === 'application/pdf') {
                          const fileName = await this.saveAttachment(
                            attachment.content as Buffer,
                            attachment.filename || 'unnamed.pdf'
                          );

                          await this.processEmailMetadata(
                            config,
                            parsed.from?.text || '',
                            parsed.subject || '',
                            parsed.date || new Date(),
                            fileName
                          );

                          processedEmails.push({
                            fileName,
                            fromAddress: parsed.from?.text || '',
                            subject: parsed.subject || '',
                            dateReceived: parsed.date || new Date()
                          });
                        }
                      }
                    }
                  } catch (error) {
                    console.error('Error processing message:', error);
                  }
                });
              });
            });

            fetch.once('end', () => {
              imap.end();
              resolve(processedEmails);
            });
          });
        });
      });

      imap.once('error', (error) => {
        reject(error);
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

    oauth2Client.setCredentials({ refresh_token: config.password });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const processedEmails: ProcessedEmail[] = [];

    try {
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'has:attachment filename:pdf',
        maxResults: 10
      });

      const messages = response.data.messages || [];

      for (const message of messages) {
        const email = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full'
        });

        const headers = email.data.payload?.headers;
        const from = headers?.find(h => h.name === 'From')?.value || '';
        const subject = headers?.find(h => h.name === 'Subject')?.value || '';
        const date = new Date(parseInt(email.data.internalDate!));

        const parts = this.findPdfAttachments(email.data.payload!);

        for (const part of parts) {
          const attachment = await gmail.users.messages.attachments.get({
            userId: 'me',
            messageId: message.id!,
            id: part.body!.attachmentId!
          });

          const fileName = await this.saveAttachment(
            Buffer.from(attachment.data.data!, 'base64'),
            part.filename || 'unnamed.pdf'
          );

          await this.processEmailMetadata(
            config,
            from,
            subject,
            date,
            fileName
          );

          processedEmails.push({ fileName, fromAddress: from, subject, dateReceived: date });
        }
      }

      return processedEmails;
    } catch (error) {
      console.error('Gmail fetch error:', error);
      throw error;
    }
  }

  private async handleOutlookConnection(config: EmailConfig): Promise<ProcessedEmail[]> {
    const client = Client.init({
      authProvider: (done) => {
        done(null, config.password); // Use the stored access token
      }
    });

    const processedEmails: ProcessedEmail[] = [];

    try {
      const response = await client.api('/me/messages')
        .filter("hasAttachments eq true")
        .select('id,subject,from,receivedDateTime,attachments')
        .top(10)
        .get();

      for (const message of response.value) {
        const attachments = await client.api(`/me/messages/${message.id}/attachments`)
          .filter("contentType eq 'application/pdf'")
          .get();

        for (const attachment of attachments.value) {
          const response = await client.api(`/me/messages/${message.id}/attachments/${attachment.id}/$value`)
            .get();

          const fileName = await this.saveAttachment(
            Buffer.from(response),
            attachment.name
          );

          await this.processEmailMetadata(
            config,
            message.from.emailAddress.address,
            message.subject,
            new Date(message.receivedDateTime),
            fileName
          );

          processedEmails.push({
            fileName,
            fromAddress: message.from.emailAddress.address,
            subject: message.subject,
            dateReceived: new Date(message.receivedDateTime)
          });
        }
      }

      return processedEmails;
    } catch (error) {
      console.error('Outlook fetch error:', error);
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
          return await this.handleOutlookConnection(config);
        default:
          throw new Error(`Unsupported connection type: ${config.connectionType}`);
      }
    } catch (error) {
      console.error(`Error fetching emails for ${config.connectionType}:`, error);
      throw error;
    }
  }
} 