import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const locales = ['en', 'es', 'fr'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  let locale: Locale = defaultLocale;

  // 1. Check NEXT_LOCALE cookie
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    locale = cookieLocale as Locale;
  } else {
    // 2. Check Accept-Language header
    const acceptLang = headerStore.get('accept-language') || '';
    const preferred = acceptLang
      .split(',')
      .map((part) => part.split(';')[0].trim().substring(0, 2).toLowerCase())
      .find((lang) => locales.includes(lang as Locale));
    if (preferred) {
      locale = preferred as Locale;
    }
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
