import { NextResponse } from 'next/server';
import { GmailService } from '@/services/gmailService';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // email address from state

    if (!code || !state) {
      return NextResponse.redirect('/error?message=Missing required parameters');
    }

    const gmailService = new GmailService();
    const tokens = await gmailService.getTokensFromCode(code);

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
        connectionType: 'GMAIL',
        username: state,
        password: tokens.refresh_token,
      }
    });

    return NextResponse.redirect('/');
  } catch (error) {
    console.error('Gmail callback error:', error);
    return NextResponse.redirect('/error?message=Failed to authenticate with Gmail');
  }
} 