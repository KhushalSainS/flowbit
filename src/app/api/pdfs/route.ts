import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const pdfs = await prisma.emailMetadata.findMany({
      where: {
        attachmentFileName: {
          not: '' as string,
          contains: '.pdf'
        }
      },
      orderBy: { 
        dateReceived: 'desc' 
      },
      select: {
        id: true,
        fromAddress: true,
        subject: true,
        dateReceived: true,
        attachmentFileName: true,
        config: {
          select: {
            emailAddress: true,
            connectionType: true
          }
        }
      }
    });
    return NextResponse.json(pdfs);
  } catch (error) {
    console.error('Failed to fetch PDFs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PDFs' },
      { status: 500 }
    );
  }
}
