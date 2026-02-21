import type { Metadata } from 'next';
import { Outfit, Sora } from 'next/font/google';
import { AuthProvider } from '@/hooks/use-auth';
import { AssistantWrapper } from '@/components/shared/assistant-wrapper';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-sans' });
const sora = Sora({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'Tipper - Digital Tipping for Hotel Staff',
  description: 'Show appreciation for hotel cleaning staff with easy digital tips',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${sora.variable}`}>
      <body className="min-h-screen bg-background antialiased">
        <AuthProvider>
          {children}
          <AssistantWrapper />
        </AuthProvider>
      </body>
    </html>
  );
}
