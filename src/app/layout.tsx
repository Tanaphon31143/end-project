import type { Metadata } from "next";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={sfThonburi.variable}>
      <body>
        {/* THESIS: A clear school command center that refuses the generic, noisy login template.
OWN-WORLD: White canvas, black hierarchy, quiet borders, SF Thonburi typography for Thai readability, and pill actions.
STORY: The visitor recognizes this as the school workspace, enters credentials, and chooses a calm next step.
FIRST VIEWPORT: A compact centered login shell with brand lockup, email/password form, Google action, and support note.
FORM: Focused single-column operational login, first expression of the established white-first system.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md */}
        {children}
      </body>
    </html>
  );
}
