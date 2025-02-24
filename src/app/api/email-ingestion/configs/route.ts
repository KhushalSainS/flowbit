import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { ConnectionType } from '@/types/email';

const DEFAULT_CONFIG = {
  host: 'imap.gmail.com',
  port: 993,
  useSSL: true,
  connectionType: 'IMAP' as ConnectionType,
  active: true,
};

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const config = await prisma.emailIngestionConfig.create({
      data: {
        ...DEFAULT_CONFIG,
        emailAddress: data.emailAddress,
        password: data.password,
        username: data.emailAddress, // Use email as username
      },
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

// ...existing GET method...
