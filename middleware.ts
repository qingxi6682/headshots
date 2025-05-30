import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 优先跳过所有 /api 路由，保证 API 不被中间件处理
  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 先处理国际化
  const response = await intlMiddleware(request);

  return response;
}

export const config = {
  matcher: [
    '/train/:path*',
    '/',
    '/(en|en-US|zh|zh-CN|zh-TW|zh-HK|zh-MO|ja|ko|ru|fr|de|ar|es|it)/:path*',
    // '/((?!privacy-policy|terms-of-service|api/|_next|_vercel|.*\\..*).*)', // 可选，建议注释掉
  ],
};
