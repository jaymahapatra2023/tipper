import { NextRequest, NextResponse } from 'next/server';

const SUPPORTED_LOCALES = ['en', 'es', 'fr'];
const DEFAULT_LOCALE = 'en';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // If NEXT_LOCALE cookie is already set and valid, pass through
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    return response;
  }

  // Detect from Accept-Language header
  const acceptLang = request.headers.get('accept-language') || '';
  const preferred = acceptLang
    .split(',')
    .map((part) => part.split(';')[0].trim().substring(0, 2).toLowerCase())
    .find((lang) => SUPPORTED_LOCALES.includes(lang));

  const locale = preferred || DEFAULT_LOCALE;

  // Set cookie so subsequent requests use the detected locale
  response.cookies.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  });

  return response;
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|.*\\..*).*)'],
};
