import "./globals.css";
import type {
  Metadata,
  Viewport,
} from "next";

import MobileNavigationShell from "@/components/layout/MobileNavigationShell";
import MobileOrientationLock from "@/components/layout/MobileOrientationLock";
import BioMentionLinker from "@/components/profile/BioMentionLinker";
import ProfileEditBridge from "@/components/profile/ProfileEditBridge";
import {
  AuthProvider,
} from "@/components/providers/AuthProvider";

const APP_NAME = "Kelo Social";
const APP_DESCRIPTION =
  "Le réseau social européen décentralisé propulsé par AT Protocol";
const APP_LOGO =
  "https://kelosocial.sirv.com/logo.png";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: APP_LOGO,
    shortcut: APP_LOGO,
    apple: APP_LOGO,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: [APP_LOGO],
  },
  twitter: {
    card: "summary",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: [APP_LOGO],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-[100dvh] overflow-x-hidden bg-[#faf9f6] font-sans text-gray-900 antialiased">
        <AuthProvider>
          <MobileOrientationLock />
          <BioMentionLinker />
          <ProfileEditBridge />
          <MobileNavigationShell>
            {children}
          </MobileNavigationShell>
        </AuthProvider>
      </body>
    </html>
  );
}
