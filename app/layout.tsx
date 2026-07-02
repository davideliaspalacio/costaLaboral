import type { Metadata } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { JsonLd } from "@/components/seo/json-ld";
import { orgJsonLd, websiteJsonLd } from "@/lib/seo";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "CostaLaboral — El camello está aquí, en la Costa",
    template: "%s · CostaLaboral",
  },
  description:
    "La plataforma de empleo del Caribe colombiano. Recibe solo las vacantes que encajan con tu perfil, directo a tu WhatsApp. Las empresas publican gratis.",
  metadataBase: new URL("https://costalaboral.co"),
  alternates: { canonical: "/" },
  keywords: [
    "empleo en la Costa",
    "trabajo Barranquilla",
    "empleo Cartagena",
    "vacantes Santa Marta",
    "camello",
    "CostaLaboral",
  ],
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "CostaLaboral",
    url: "/",
    title: "CostaLaboral — El camello está aquí, en la Costa",
    description:
      "La plataforma de empleo del Caribe colombiano. Vacantes que encajan contigo, directo a tu WhatsApp.",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${bricolage.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <JsonLd data={[orgJsonLd(), websiteJsonLd()]} />
        <Header />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
