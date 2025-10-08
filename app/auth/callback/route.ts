import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  console.log('AuthCallback: Processing callback');
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');

  if (code) {
    console.log('AuthCallback: Exchanging code for session');
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('AuthCallback: Error:', error);
      return NextResponse.redirect(new URL('/login?error=auth-failed', requestUrl.origin));
    }

    // Check if user has completed onboarding
    if (session?.user) {
      const { data: userData } = await supabase
        .from('users')
        .select('firstname, lastname')
        .eq('id', session.user.id)
        .single();

      // If user doesn't have name, redirect to welcome
      if (!userData?.firstname || !userData?.lastname) {
        console.log('AuthCallback: User needs onboarding, redirecting to welcome');
        return NextResponse.redirect(new URL('/welcome', requestUrl.origin));
      }
    }

    // Redirect to the next page if provided, otherwise go to dashboard
    if (next) {
      console.log('AuthCallback: Redirecting to:', next);
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    console.log('AuthCallback: Success, redirecting to dashboard');
    return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
  }

  console.log('AuthCallback: No code present, redirecting to login');
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
} 