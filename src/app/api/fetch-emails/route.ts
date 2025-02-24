import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/utils/emailService';

let isProcessing = false;

export async function POST(request: Request) {
  if (isProcessing) {
    return NextResponse.json(
      { error: 'Email fetch already in progress' },
      { status: 429 }
    );
  }

  try {
    isProcessing = true;
    const { configId } = await request.json();
    
    if (!configId) {
      return NextResponse.json(
        { error: 'Config ID is required' },
        { status: 400 }
      );
    }

    const config = await prisma.emailConfig.findUnique({
      where: { id: configId }
    });

    if (!config) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    const emailService = new EmailService();
    const result = await emailService.fetchEmails(config);

    return NextResponse.json({
      success: true,
      processedEmails: result.length,
      emails: result
    });
  } catch (error) {
    console.error('Failed to fetch emails:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch emails' },
      { status: 500 }
    );
  } finally {
    isProcessing = false;
  }
} 