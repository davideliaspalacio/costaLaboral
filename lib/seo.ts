import type { Metadata } from "next";

export const SITE = {
  name: "CostaLaboral",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://costalaboral.co").replace(/\/$/, ""),
  locale: "es_CO",
  descripcion:
    "CostaLaboral conecta candidatos y empresas del Caribe colombiano. Vacantes abiertas con empresa y salario, postulación gratis y match explicable. Las empresas publican gratis.",
  ciudades: ["Barranquilla", "Cartagena", "Santa Marta", "Montería", "Sincelejo", "Valledupar"],
  twitter: "@costalaboral",
};

/** URL absoluta a partir de una ruta relativa. */
export function absUrl(path = "/"): string {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Construye Metadata de Next con canonical + Open Graph + Twitter consistentes. */
export function buildMetadata(opts: {
  title?: string;
  description?: string;
  path?: string;
  image?: string; // ruta relativa o absoluta; si se omite, cada ruta usa su opengraph-image
  type?: "website" | "article";
  keywords?: string[];
  noindex?: boolean;
}): Metadata {
  const { title, description = SITE.descripcion, path = "/", image, type = "website", keywords, noindex } = opts;
  const url = absUrl(path);
  const images = image ? [{ url: image.startsWith("http") ? image : absUrl(image), width: 1200, height: 630 }] : undefined;

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type,
      url,
      siteName: SITE.name,
      locale: SITE.locale,
      title: title ?? SITE.name,
      description,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: title ?? SITE.name,
      description,
      ...(images ? { images: images.map((i) => i.url) } : {}),
    },
  };
}

/* ------------------------- JSON-LD builders ------------------------- */

export function orgJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: absUrl("/icon"),
    description: SITE.descripcion,
    areaServed: SITE.ciudades.map((c) => ({ "@type": "City", name: c })),
    sameAs: ["https://www.instagram.com/costalaboral", "https://wa.me/"],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    inLanguage: "es-CO",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE.url}/ofertas?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/** Tipo de empleo (jornada) → employmentType de schema.org. */
export const EMPLOYMENT_TYPE = {
  tiempo_completo: "FULL_TIME",
  medio_tiempo: "PART_TIME",
  por_dias: "PER_DIEM",
  temporal: "TEMPORARY",
  practicas: "INTERN",
} as const;

export function employmentTypeDe(tipo: string): string {
  return EMPLOYMENT_TYPE[tipo as keyof typeof EMPLOYMENT_TYPE] ?? "FULL_TIME";
}

/** Schema JobPosting — habilita resultados enriquecidos y Google Jobs. */
export function jobPostingJsonLd(v: {
  id: string;
  titulo: string;
  descripcion: string;
  requisitos?: string;
  ciudad: string;
  modalidad: string;
  tipo: string;
  salario_min: number | null;
  salario_max: number | null;
  publicada_en: string | null;
  creado_en: string;
  expira_en: string;
  empresaNombre: string;
}) {
  const desc = [v.descripcion, v.requisitos ? `Requisitos: ${v.requisitos}` : ""].filter(Boolean).join("\n\n");
  const salario = v.salario_min ?? v.salario_max;
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: v.titulo,
    description: desc,
    datePosted: new Date(v.publicada_en ?? v.creado_en).toISOString(),
    validThrough: new Date(v.expira_en).toISOString(),
    employmentType: employmentTypeDe(v.tipo),
    hiringOrganization: {
      "@type": "Organization",
      name: v.empresaNombre,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: v.ciudad,
        addressRegion: "Caribe",
        addressCountry: "CO",
      },
    },
    ...(v.modalidad === "remoto"
      ? {
          jobLocationType: "TELECOMMUTE",
          applicantLocationRequirements: { "@type": "Country", name: "Colombia" },
        }
      : {}),
    ...(salario
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: "COP",
            value: {
              "@type": "QuantitativeValue",
              minValue: salario,
              maxValue: v.salario_max ?? salario,
              unitText: "MONTH",
            },
          },
        }
      : {}),
    directApply: true,
    url: absUrl(`/v/${v.id}`),
  };
}

export function articleJsonLd(post: {
  slug: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  autor?: string;
  imagen?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.titulo,
    description: post.descripcion,
    datePublished: new Date(post.fecha).toISOString(),
    dateModified: new Date(post.fecha).toISOString(),
    author: { "@type": "Organization", name: post.autor || SITE.name },
    publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: absUrl("/icon.png") } },
    mainEntityOfPage: absUrl(`/blog/${post.slug}`),
    inLanguage: "es-CO",
    ...(post.imagen ? { image: post.imagen.startsWith("http") ? post.imagen : absUrl(post.imagen) } : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absUrl(it.path),
    })),
  };
}
