import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
// Using Outfit for that "modern numerals" look
const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit' });

export const viewport = {
    themeColor: 'black',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false, // "App-like" feel, prevent zooming
    viewportFit: 'cover',
}

export const metadata = {
    title: "GymTracker",
    description: "Advanced PWA Workout Tracker",
    manifest: "/manifest.json",
    icons: {
        icon: "/icons/icon-192.png",
        shortcut: "/icons/icon-192.png",
        apple: "/icons/icon-192.png",
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: "GymTracker",
    },
    formatDetection: {
        telephone: false,
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${outfit.variable} antialiased bg-black text-white` }>
                <div className="mx-auto max-w-3xl px-4 sm:px-6">
                    <main>
                        {children}
                    </main>
                </div>
                <Navbar />
            </body>
        </html>
    );
}
