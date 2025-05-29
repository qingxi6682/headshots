/*
 * @version: 1.0.0
 * @Author: Eblis
 * @Date: 2025-05-05 17:13:34
 * @LastEditTime: 2025-05-28 21:12:23
 */
import '@/app/globals.css';
import '@/app/fonts/inter/inter.css';

import { getMessages, getTranslations } from 'next-intl/server';
import { locales } from '@/i18n/locale';

import { AppContextProvider } from '@/contexts/app';
import { Metadata } from 'next';
import { NextAuthSessionProvider } from '@/auth/session';
import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from '@/providers/theme';
import { cn } from '@/lib/utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations();

  return {
    title: {
      template: `%s`,
      default: t('metadata.title') || '',
    },
    description: t('metadata.description') || '',
    keywords: t('metadata.keywords') || '',
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || '';
  const googleAdsenseCode = process.env.NEXT_PUBLIC_GOOGLE_ADCODE || '';

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {googleAdsenseCode && (
          <meta name="google-adsense-account" content={googleAdsenseCode} />
        )}

        <link rel="icon" href="/favicon.ico" />

        {locales &&
          locales.map(loc => (
            <link
              key={loc}
              rel="alternate"
              hrefLang={loc}
              href={`${webUrl}${loc === 'en' ? '' : `/${loc}`}/`}
            />
          ))}
        <link rel="alternate" hrefLang="x-default" href={webUrl} />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased overflow-x-hidden'
        )}
      >
        <NextIntlClientProvider messages={messages}>
          <NextAuthSessionProvider>
            <AppContextProvider>
              <ThemeProvider attribute="class" disableTransitionOnChange>
                {children}
              </ThemeProvider>
            </AppContextProvider>
          </NextAuthSessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
