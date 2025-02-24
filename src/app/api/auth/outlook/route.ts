import { NextResponse } from 'next/server';
import { OutlookService } from '@/services/outlookService';

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

    const outlookService = new OutlookService();
    const authUrl = await outlookService.getAuthUrl(email);
    return NextResponse.json({ url: authUrl });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
} 