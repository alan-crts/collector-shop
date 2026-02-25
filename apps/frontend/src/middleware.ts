import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Quick pre-check for protected routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/profile')) {
        // Check if the generic better-auth session token cookie exists
        const sessionCookie =
            request.cookies.get('better-auth.session_token') ||
            request.cookies.get('__Secure-better-auth.session_token');

        // If not authenticated, instantly redirect to login with the redirectTo intent
        if (!sessionCookie) {
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            url.searchParams.set('redirectTo', pathname);
            return NextResponse.redirect(url);
        }
        // We let it pass to SSR or Client which will double check the true validity and role (e.g., ADMIN)
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/profile/:path*'],
};
