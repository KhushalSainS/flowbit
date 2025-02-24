import { NextResponse } from 'next/server';
import { GmailService } from '@/services/gmailService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    const gmailService = new GmailService();
    const authUrl = await gmailService.getAuthUrl(email);
    return NextResponse.json({ url: authUrl });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
} 