import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmailIngestionService } from '@/services/emailIngestion';
import type { ConnectionType } from '@/types/email';

export async function POST() {
  try {
    const configs = await prisma.emailIngestionConfig.findMany({
      where: { active: true }
    });

    const emailService = new EmailIngestionService();

    for (const config of configs) {
      await emailService.processEmails({
        ...config,
        connectionType: config.connectionType as ConnectionType
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error checking emails:', error);
    return NextResponse.json(
      { error: 'Failed to check emails' },
      { status: 500 }
    );
  }
}
