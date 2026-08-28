import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL("https://wasd-keyboard.vercel.app"),
  title: "The WASD Keyboard",
  description: "An interactive 3D WASD keyboard experience by Jherem.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "The WASD Keyboard",
    description: "Made for the True Professionals",
    url: "/",
    siteName: "The WASD Keyboard",
    images: [
      {
        url: "/og-keyboard.png",
        width: 1200,
        height: 630,
        alt: "The WASD Keyboard interactive 3D experience",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The WASD Keyboard",
    description: "Made for the True Professionals",
    images: ["/og-keyboard.png"],
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
