import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 先处理国际化
  const response = await intlMiddleware(request);

  // 检查是否是 /train 路由
  if (request.nextUrl.pathname.startsWith('/train')) {
    const session = await auth();
    if (!session?.user) {
      // 未登录时重定向到登录页面
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/train/:path*',
    '/',
    '/(en|en-US|zh|zh-CN|zh-TW|zh-HK|zh-MO|ja|ko|ru|fr|de|ar|es|it)/:path*',
    '/((?!privacy-policy|terms-of-service|api/|_next|_vercel|.*\\..*).*)',
  ],
};
