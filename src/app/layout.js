import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { AICoachShell } from "@/components/coach/AICoachShell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata = {
  title: "GymTracker",
  description: "AI-Powered Workout Tracker",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    shortcut: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GymTracker",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body
        className={`${inter.variable} ${outfit.variable} font-sans antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var isLocalhost =
                  window.location.hostname === "localhost" ||
                  window.location.hostname === "127.0.0.1";
                if (!isLocalhost) return;

                if ("serviceWorker" in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function (regs) {
                    regs.forEach(function (reg) { reg.unregister(); });
                  });
                }

                if ("caches" in window) {
                  caches.keys().then(function (keys) {
                    keys.forEach(function (key) { caches.delete(key); });
                  });
                }
              })();
            `,
          }}
        />
        <div className="mx-auto max-w-lg px-4">
          <main>{children}</main>
        </div>
        <AICoachShell />
        <Navbar />
      </body>
    </html>
  );
}
