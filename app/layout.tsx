import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kelo Social',
  description: 'Le réseau social décentralisé propulsé par AT Protocol',
  icons: {
    icon: 'https://kelosocial.sirv.com/logo.png',
    shortcut: 'https://kelosocial.sirv.com/logo.png',
    apple: 'https://kelosocial.sirv.com/logo.png',
  },
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
