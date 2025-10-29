import { NextResponse } from 'next/server';

const APP_PASSWORD = process.env.APP_PASSWORD || 'please-change-me';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (typeof password !== 'string' || password.length === 0) {
      return NextResponse.json({ message: 'Password required' }, { status: 400 });
    }

    if (password !== APP_PASSWORD) {
      return NextResponse.json({ message: 'Invalid password' }, { status: 401 });
    }

    const res = NextResponse.json({ message: 'Authenticated' }, { status: 200 });
    res.cookies.set('auth', '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  } catch (error) {
    return NextResponse.json({ message: 'Authentication failed' }, { status: 500 });
  }
}

