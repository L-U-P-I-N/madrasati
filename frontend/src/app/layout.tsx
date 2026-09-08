import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'مدرستي — نظام إدارة المدرسة',
  description: 'منصة متكاملة لإدارة المدرسة: الطلاب، المعلمون، الفصول، الدرجات، والإعلانات.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
