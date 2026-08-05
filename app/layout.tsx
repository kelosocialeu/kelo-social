import "./globals.css";
import type { Metadata } from "next";

import MobileNavigationShell from "@/components/layout/MobileNavigationShell";
import {
  AuthProvider,
} from "@/components/providers/AuthProvider";

export const metadata: Metadata = {
  title: "Kelo Social",
  description:
    "Le réseau social décentralisé propulsé par AT Protocol",
  icons: {
    icon:
      "https://kelosocial.sirv.com/logo.png",
    shortcut:
      "https://kelosocial.sirv.com/logo.png",
    apple:
      "https://kelosocial.sirv.com/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-[#faf9f6] font-sans text-gray-900 antialiased">
        <AuthProvider>
          <MobileNavigationShell>
            {children}
          </MobileNavigationShell>
        </AuthProvider>
      </body>
    </html>
  );
}
