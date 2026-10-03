import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KI Fahrzeugschaden MVP",
  description: "Unverbindliche KI-basierte Ersteinschätzung für Fahrzeugschäden"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
