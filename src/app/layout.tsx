import type { Metadata } from 'next';
import { Nunito, Quicksand } from 'next/font/google';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-nunito',
});

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-quicksand',
});

export const metadata: Metadata = {
  title: 'PawCalendar · Planificador de cuidado de tu perro',
  description:
    'Configura el perfil de tu perro y obtén un planificador semanal de cuidado personalizado. Proyecto universitario — Feria académica U. Mayor.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${nunito.variable} ${quicksand.variable}`}>
      <body>{children}</body>
    </html>
  );
}
