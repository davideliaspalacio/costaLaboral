import type { MetadataRoute } from "next";
import { absUrl } from "@/lib/seo";
import { createAdminClient } from "@/lib/supabase/admin";
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
  ];

  const admin = createAdminClient();
  const { data } = await admin
    .from("vacantes")
    .select("id, creado_en")
    .eq("activa", true)
    .neq("estado_moderacion", "rechazada")
    .limit(2000);
  const vacantes: MetadataRoute.Sitemap = (data ?? []).map((v) => ({
    url: absUrl(`/v/${v.id}`),
    lastModified: new Date(v.creado_en as string),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // Artículos del blog (definidos por el módulo de blog).
  const posts: MetadataRoute.Sitemap = getPostsBlog().map((p) => ({
    url: absUrl(`/blog/${p.slug}`),
    lastModified: new Date(p.fecha),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...estaticas, ...vacantes, ...posts];
}
