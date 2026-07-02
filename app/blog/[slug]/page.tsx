import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { ArrowRight, ChevronRight, User, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { ShareButtons } from "@/components/seo/share-buttons";
import {
  buildMetadata,
  absUrl,
  articleJsonLd,
  breadcrumbJsonLd,
} from "@/lib/seo";
import { cn } from "@/lib/utils";
import { getPostsBlog, getPostBlog } from "@/lib/blog/posts";

export function generateStaticParams() {
  return getPostsBlog().map((p) => ({ slug: p.slug }));
}

function fechaLegible(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBlog(slug);
  if (!post) {
    return buildMetadata({
      title: "Artículo no encontrado",
      path: `/blog/${slug}`,
      noindex: true,
    });
  }
  return buildMetadata({
    title: post.titulo,
    description: post.descripcion,
    path: `/blog/${slug}`,
    type: "article",
    keywords: post.tags,
  });
}

export default async function ArticuloPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBlog(slug);
  if (!post) notFound();

  const html = await marked.parse(post.cuerpo);

  // Artículos relacionados: misma categoría primero, si no, los más recientes.
  const otros = getPostsBlog().filter((p) => p.slug !== post.slug);
  const relacionados = [
    ...otros.filter((p) => p.categoria === post.categoria),
    ...otros.filter((p) => p.categoria !== post.categoria),
  ].slice(0, 3);

  return (
    <div className="container-page py-8 sm:py-12">
      <JsonLd
        data={[
          articleJsonLd(post),
          breadcrumbJsonLd([
            { name: "Inicio", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.titulo, path: `/blog/${post.slug}` },
          ]),
        ]}
      />

      <article className="mx-auto max-w-3xl">
        {/* Breadcrumb visual */}
        <nav
          aria-label="Miga de pan"
          className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-muted"
        >
          <Link href="/" className="hover:text-ink hover:underline">
            Inicio
          </Link>
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          <Link href="/blog" className="hover:text-ink hover:underline">
            Blog
          </Link>
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          <span className="line-clamp-1 text-ink-soft">{post.titulo}</span>
        </nav>

        {/* Cabecera */}
        <header className="mt-6">
          <Link href={`/blog?cat=${encodeURIComponent(post.categoria)}`}>
            <Badge tone="brand">{post.categoria}</Badge>
          </Link>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-[1.05] text-ink sm:text-4xl lg:text-5xl">
            {post.titulo}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-muted">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-4 w-4" /> {post.autor}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> {fechaLegible(post.fecha)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {post.minutos} min de lectura
            </span>
          </div>
        </header>

        <hr className="mt-6 border-line" />

        {/* Cuerpo Markdown — prose hecha a mano con Tailwind */}
        <div
          className="mt-6 max-w-none text-base
            [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:leading-tight [&_h2]:text-ink
            [&_h3]:mt-8 [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-extrabold [&_h3]:text-ink
            [&_p]:mt-4 [&_p]:leading-relaxed [&_p]:text-ink-soft
            [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6 [&_ul]:text-ink-soft
            [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-6 [&_ol]:text-ink-soft
            [&_li]:leading-relaxed [&_li]:marker:font-bold [&_li]:marker:text-brand-600
            [&_a]:font-semibold [&_a]:text-brand-700 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-brand-800
            [&_strong]:font-extrabold [&_strong]:text-ink
            [&_blockquote]:mt-6 [&_blockquote]:rounded-r-xl [&_blockquote]:border-l-4 [&_blockquote]:border-ink [&_blockquote]:bg-sol-100 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:font-medium [&_blockquote]:text-ink [&_blockquote_p]:mt-0"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Compartir */}
        <div className="mt-10 border-t-2 border-ink pt-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
            Comparte este artículo
          </p>
          <ShareButtons
            url={absUrl(`/blog/${post.slug}`)}
            titulo={post.titulo}
          />
        </div>

        {/* CTA sticker */}
        <div className="mt-10 rounded-2xl border-2 border-ink bg-sol-300 p-6 shadow-[var(--shadow-sticker)] sm:p-8">
          <h2 className="font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
            ¿Listo para tu próximo camello?
          </h2>
          <p className="mt-2 max-w-lg font-medium text-ink-soft">
            Regístrate gratis y recibe por WhatsApp solo las vacantes que van
            contigo. O arma tu hoja de vida con IA en minutos.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/registro-candidato"
              className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
            >
              Buscar camello gratis
            </Link>
            <Link
              href="/hoja-de-vida"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Crear mi hoja de vida
            </Link>
          </div>
        </div>

        {/* Artículos relacionados */}
        {relacionados.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-extrabold text-ink">
              Sigue leyendo
            </h2>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {relacionados.map((rel) => (
                <li key={rel.slug} className="flex">
                  <Link
                    href={`/blog/${rel.slug}`}
                    className="group flex flex-1 flex-col rounded-2xl border-2 border-ink bg-surface p-5 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-sticker)]"
                  >
                    <Badge tone="brand">{rel.categoria}</Badge>
                    <h3 className="mt-3 font-display text-base font-extrabold leading-tight text-ink group-hover:underline">
                      {rel.titulo}
                    </h3>
                    <span className="mt-auto pt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-700">
                      Leer
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </div>
  );
}
