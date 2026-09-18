import type { Metadata } from 'next';
import '@/styles/globals.css';
import LanguageProvider from '@/components/LanguageProvider';

export const metadata: Metadata = {
  title: 'حجوزات محمية المرزوم',
  description: 'نظام إدارة حجوزات مخيمات محمية المرزوم.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" data-theme="light">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
