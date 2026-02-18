import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Life Friction Analyzer',
  description: 'Client-side diagnostic interface for execution friction during task initiation.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
