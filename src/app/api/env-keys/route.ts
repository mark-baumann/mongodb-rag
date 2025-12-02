import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  const authed = cookieStore.get('auth')?.value === '1';

  if (!authed) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Return API keys from environment variables
  return NextResponse.json({
    openaiKey: process.env.OPENAI_API_KEY || '',
    googleKey: process.env.GOOGLE_API_KEY || '',
  });
}
