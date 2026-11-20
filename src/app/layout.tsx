import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Rubik } from "next/font/google";
import "./globals.css";

// Calm Mint design: Rubik for everything, JetBrains Mono for code and the < IN > logo.
const rubik = Rubik({ variable: "--font-rubik", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"], weight: ["400", "500", "700", "800"] });

// The public web address, used to build the full links in the share preview. On Vercel it is picked up
// automatically; set NEXT_PUBLIC_SITE_URL only if the site moves to its own domain.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://cic-launchpad.vercel.app");
const DESCRIPTION = "Free Python lessons for high school students from Coding in Color in Phoenix, Arizona. Join with your class code and learn at your own pace.";

// Each page sets its own title ("My course · CIC Launchpad"). The icon and the share picture come from
// icon.svg, apple-icon.tsx and opengraph-image.tsx in this folder.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "CIC Launchpad",
  description: DESCRIPTION,
  applicationName: "CIC Launchpad",
  openGraph: { type: "website", siteName: "CIC Launchpad", title: "CIC Launchpad: learn to code at your own pace", description: DESCRIPTION, url: "/", locale: "en_US" },
  twitter: { card: "summary_large_image", title: "CIC Launchpad: learn to code at your own pace", description: DESCRIPTION },
};

export const viewport: Viewport = { themeColor: "#0B3D1E" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${rubik.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
