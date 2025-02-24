import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const pdfs = await prisma.pDFAttachment.findMany({
      orderBy: { dateReceived: 'desc' },
    });
    return NextResponse.json(pdfs);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch PDFs' },
      { status: 500 }
    );
  }
}
