import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmailIngestionService } from '@/services/emailIngestion';

// Define the ConnectionType enum to match Prisma's schema
export enum ConnectionType {
  IMAP = 'IMAP',
  GMAIL = 'GMAIL',
  OUTLOOK = 'OUTLOOK'
}

const isValidConnectionType = (type: string): type is ConnectionType => {
  return Object.values(ConnectionType).includes(type as ConnectionType);
};

export async function GET() {
  const configs = await prisma.emailIngestionConfig.findMany();
  return NextResponse.json(configs);
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!isValidConnectionType(data.connectionType)) {
      return NextResponse.json(
        { error: 'Invalid connection type' },
        { status: 400 }
      );
    }

    const config = await prisma.emailIngestionConfig.create({
      data: {
        emailAddress: data.emailAddress,
        connectionType: data.connectionType,
        username: data.username || null,
        password: data.password,
        host: data.host || null,
        port: data.port ? parseInt(data.port) : null,
        useSSL: Boolean(data.useSSL),
        active: true,
      },
    });

    const emailService = new EmailIngestionService();
    await emailService.testConnection({
      ...config,
      connectionType: config.connectionType as ConnectionType
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error creating email config:', error);
    return NextResponse.json(
      { error: 'Failed to create email configuration' },
      { status: 500 }
    );
  }
}
