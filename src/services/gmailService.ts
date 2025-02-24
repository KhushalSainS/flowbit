import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { EmailConfig, ProcessedEmail } from '@/types/email';
import { prisma } from '@/lib/prisma';
import path from 'path';
import fs from 'fs/promises';

export class GmailService {
  private oauth2Client: OAuth2Client;

  constructor() {
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
      throw new Error('Gmail credentials not configured');
    }

    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );
  }

  private async saveAttachment(buffer: Buffer, fileName: string): Promise<string> {
    const pdfDir = path.join(process.cwd(), 'public', 'pdfs');
    await fs.mkdir(pdfDir, { recursive: true });

    const uniqueFileName = `${Date.now()}-${fileName}`;
    const filePath = path.join(pdfDir, uniqueFileName);
    
    await fs.writeFile(filePath, buffer);
    return uniqueFileName;
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
      this.oauth2Client.setCredentials({
        refresh_token: config.password // Using password field to store refresh token
      });

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      const processedEmails: ProcessedEmail[] = [];

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

              await prisma.emailMetadata.create({
                data: {
                  configId: config.id,
                  fromAddress: from,
                  subject,
                  dateReceived: date,
                  attachmentFileName: fileName
                }
              });

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
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch Gmail messages');
    }
  }

  async getAuthUrl(email: string): Promise<string> {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: email // Pass email address as state
    });
  }

  async getTokensFromCode(code: string): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token!
    };
  }
} 