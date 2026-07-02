import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Newspaper, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { JsonLd } from "@/components/seo/json-ld";
import { buildMetadata, absUrl, SITE } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { getPostsBlog, getCategoriasBlog } from "@/lib/blog/posts";

export const metadata: Metadata = buildMetadata({
  title: "Blog · Empleo en la Costa",
  description:
    "Consejos de empleo, hojas de vida y guías por ciudad del Caribe colombiano.",
  path: "/blog",
});

function fechaLegible(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const categorias = getCategoriasBlog();
  const todos = getPostsBlog();
  const catActiva = cat && categorias.includes(cat) ? cat : null;
  const posts = catActiva ? todos.filter((p) => p.categoria === catActiva) : todos;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${SITE.name} · Blog`,
    url: absUrl("/blog"),
    inLanguage: "es-CO",
    blogPost: todos.map((p) => ({
      "@type": "BlogPosting",
      headline: p.titulo,
      description: p.descripcion,
      datePublished: new Date(p.fecha).toISOString(),
      url: absUrl(`/blog/${p.slug}`),
      author: { "@type": "Organization", name: p.autor },
    })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* ---------- CABECERA ---------- */}
      <section className="border-b-2 border-ink bg-canvas">
        <div className="container-page py-14 sm:py-16">
          <span className="kicker">
            <Newspaper className="h-3.5 w-3.5" /> Blog
          </span>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-extrabold leading-[0.98] text-ink sm:text-5xl lg:text-6xl">
            Consejos de empleo para la gente de la Costa
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-medium text-ink-soft">
            Guías por ciudad, tips de hoja de vida y todo lo que necesitas para
            conseguir tu próximo camello en el Caribe colombiano.
          </p>

          {/* Filtro por categoría */}
          <nav
            aria-label="Filtrar por categoría"
            className="mt-8 flex flex-wrap gap-2.5"
          >
            <Link
              href="/blog"
              aria-current={!catActiva ? "page" : undefined}
              className={cn(
                "chip transition hover:bg-sol-300",
                !catActiva && "bg-ink text-canvas hover:bg-ink",
              )}
            >
              Todos
            </Link>
            {categorias.map((c) => (
              <Link
                key={c}
                href={`/blog?cat=${encodeURIComponent(c)}`}
                aria-current={catActiva === c ? "page" : undefined}
                className={cn(
                  "chip transition hover:bg-sol-300",
                  catActiva === c && "bg-ink text-canvas hover:bg-ink",
                )}
              >
                {c}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {/* ---------- GRID DE ARTÍCULOS ---------- */}
      <section className="container-page py-14 sm:py-16">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug} className="flex">
              <Link
                href={`/blog/${post.slug}`}
                className="group flex flex-1 flex-col rounded-2xl border-2 border-ink bg-surface p-6 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-sticker)]"
              >
                <div className="flex items-center gap-2">
                  <Badge tone="brand">{post.categoria}</Badge>
                </div>
                <h2 className="mt-4 font-display text-xl font-extrabold leading-tight text-ink group-hover:underline">
                  {post.titulo}
                </h2>
                <p className="mt-2.5 flex-1 text-sm font-medium leading-relaxed text-ink-soft">
                  {post.descripcion}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-muted">
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> {post.autor}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{fechaLegible(post.fecha)}</span>
                  <span aria-hidden>·</span>
                  <span>{post.minutos} min</span>
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-700">
                  Leer artículo
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
