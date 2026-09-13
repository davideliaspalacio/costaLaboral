import type { MetadataRoute } from "next";
import { absUrl } from "@/lib/seo";
import { getVacantesParaSitemap } from "@/lib/data/ofertas";
import { getPostsBlog } from "@/lib/blog/posts";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const estaticas: MetadataRoute.Sitemap = [
    { url: absUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absUrl("/ofertas"), changeFrequency: "hourly", priority: 0.9 },
    { url: absUrl("/planes"), changeFrequency: "monthly", priority: 0.6 },
    { url: absUrl("/blog"), changeFrequency: "weekly", priority: 0.7 },
    { url: absUrl("/registro-candidato"), changeFrequency: "monthly", priority: 0.5 },
    { url: absUrl("/registro-empresa"), changeFrequency: "monthly", priority: 0.5 },
    { url: absUrl("/login"), changeFrequency: "yearly", priority: 0.3 },
    { url: absUrl("/privacidad"), changeFrequency: "yearly", priority: 0.3 },
    { url: absUrl("/terminos"), changeFrequency: "yearly", priority: 0.3 },
    { url: absUrl("/datos-personales"), changeFrequency: "yearly", priority: 0.3 },
  ];

  // Solo vacantes públicas (publicada + aprobada) y sin expirar. Si no hay
  // variables/conexión (p. ej. build sin env), se genera con lo estático + blog.
  let vacantes: MetadataRoute.Sitemap = [];
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      vacantes = (await getVacantesParaSitemap()).map((v) => ({
        url: absUrl(`/v/${v.id}`),
        lastModified: new Date(v.actualizada_en),
        changeFrequency: "daily",
        priority: 0.8,
      }));
    } catch {
      // Sin conexión a la BD durante el build: se omiten las vacantes.
    }
  }

  const posts: MetadataRoute.Sitemap = getPostsBlog().map((p) => ({
    url: absUrl(`/blog/${p.slug}`),
    lastModified: new Date(p.fecha),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...estaticas, ...vacantes, ...posts];
}
