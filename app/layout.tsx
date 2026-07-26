import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kelo Social',
  description: 'Le réseau social décentralisé propulsé par AT Protocol',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      {/* On applique le fond clair par défaut sur l'ensemble du corps du site */}
      <body className="bg-[#faf9f6] text-gray-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
