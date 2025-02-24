import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const metadata = await prisma.emailMetadata.findMany({
      include: {
        config: true
      },
      orderBy: {
        dateReceived: 'desc'
      },
      take: 100
    });

    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Failed to fetch email metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email metadata' },
      { status: 500 }
    );
  }
} 