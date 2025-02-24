import { NextResponse } from 'next/server';
import { OutlookService } from '@/services/outlookService';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // email address from state

    if (!code || !state) {
      return NextResponse.redirect('/error?message=Missing required parameters');
    }

    const outlookService = new OutlookService();
    const tokens = await outlookService.getTokensFromCode(code);

    // Upsert the email config
    await prisma.emailConfig.upsert({
      where: {
        emailAddress: state,
      },
      update: {
        password: tokens.refresh_token,
      },
      create: {
        emailAddress: state,
        connectionType: 'OUTLOOK',
        username: state,
        password: tokens.refresh_token,
      }
    });

    return NextResponse.redirect('/');
  } catch (error) {
    console.error('Outlook callback error:', error);
    return NextResponse.redirect('/error?message=Failed to authenticate with Outlook');
  }
} 