import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import { AppToaster } from "@/components/layout/toaster";
import "./globals.css";

const workSans = Work_Sans({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Sienes · Resumen de historia clínica",
  description: "Asistente para redactar resúmenes de historia clínica a partir de exportaciones de Medexis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${workSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppToaster>{children}</AppToaster>
      </body>
    </html>
  );
}
