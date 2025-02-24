import { Client } from '@microsoft/microsoft-graph-client';
import { EmailConfig, ProcessedEmail } from '@/types/email';
import { prisma } from '@/lib/prisma';
import path from 'path';
import fs from 'fs/promises';

export class OutlookService {
  private async saveAttachment(buffer: Buffer, fileName: string): Promise<string> {
    const pdfDir = path.join(process.cwd(), 'public', 'pdfs');
    await fs.mkdir(pdfDir, { recursive: true });

    const uniqueFileName = `${Date.now()}-${fileName}`;
    const filePath = path.join(pdfDir, uniqueFileName);
    
    await fs.writeFile(filePath, buffer);
    return uniqueFileName;
  }

  async getAuthUrl(email: string): Promise<string> {
    const baseUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
    const params = new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID!,
      response_type: 'code',
      redirect_uri: process.env.OUTLOOK_REDIRECT_URI!,
      response_mode: 'query',
      scope: 'offline_access Mail.Read Mail.ReadWrite',
      state: email
    });

    return `${baseUrl}?${params.toString()}`;
  }

  async getTokensFromCode(code: string): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    const params = new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID!,
      client_secret: process.env.AZURE_CLIENT_SECRET!,
      code,
      redirect_uri: process.env.OUTLOOK_REDIRECT_URI!,
      grant_type: 'authorization_code'
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      throw new Error('Failed to get tokens');
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token
    };
  }

  async fetchEmails(config: EmailConfig): Promise<ProcessedEmail[]> {
    const client = Client.init({
      authProvider: (done) => {
        done(null, config.password); // Using password field to store access token
      }
    });

    const processedEmails: ProcessedEmail[] = [];

    try {
      const messages = await client.api('/me/messages')
        .filter("hasAttachments eq true")
        .select('id,subject,from,receivedDateTime,attachments')
        .top(10)
        .get();

      for (const message of messages.value) {
        try {
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

            await prisma.emailMetadata.create({
              data: {
                configId: config.id,
                fromAddress: message.from.emailAddress.address,
                subject: message.subject,
                dateReceived: new Date(message.receivedDateTime),
                attachmentFileName: fileName
              }
            });

            processedEmails.push({
              fileName,
              fromAddress: message.from.emailAddress.address,
              subject: message.subject,
              dateReceived: new Date(message.receivedDateTime)
            });
          }

          // Mark message as read
          await client.api(`/me/messages/${message.id}`)
            .update({ isRead: true });

        } catch (error) {
          console.error(`Error processing message ${message.id}:`, error);
          continue;
        }
      }

      return processedEmails;
    } catch (error) {
      console.error('Outlook fetch error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch Outlook messages');
    }
  }
} 