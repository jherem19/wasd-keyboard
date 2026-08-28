import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "The WASD Keyboard",
  description: "An interactive 3D WASD keyboard experience by Jherem.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
