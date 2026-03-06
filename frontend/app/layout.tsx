import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emotria — Facial Expression Recognition & Behavior Analysis",
  description:
    "Advanced AI-powered real-time facial emotion detection system with behavior analytics, multi-person recognition, and emotional intelligence insights.",
  keywords: [
    "facial expression recognition",
    "emotion detection",
    "AI",
    "deep learning",
    "behavior analysis",
    "computer vision",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen overflow-x-hidden">{children}</body>
    </html>
  );
}
