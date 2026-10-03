import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const sfThonburi = localFont({
  src: [
    { path: "./fonts/SFThonburi-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/SFThonburi-Semibold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/SFThonburi-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-sf-thonburi",
  display: "swap",
});

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ | School OS",
  description: "ศูนย์บัญชาการโรงเรียน",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={sfThonburi.variable}>
      <body>
        {children}
      </body>
    </html>
  );
}
