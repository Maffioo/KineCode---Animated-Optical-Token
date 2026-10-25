import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://kinecode.dev'),
  title: 'KineCode — Optical Proof-of-Presence Protocol',
  description:
    'Animated, self-rotating QR codes for physical presence check-ins. A forwarded screenshot stops working within seconds. Zero server state, sub-second capture.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'KineCode — Optical Proof-of-Presence Protocol',
    description:
      'Animated, self-rotating QR codes for physical presence check-ins. Defeat proxy attendance and photo forwarding in lecture halls, exams, and secure access.',
    images: ['/logo.png'],
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-dark-950 text-slate-100 antialiased selection:bg-brand-cyan/20 selection:text-brand-cyan min-h-[100dvh]">
        {children}
      </body>
    </html>
  );
}
