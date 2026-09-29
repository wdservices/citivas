import type { ReactNode } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import SEO from "@/components/SEO";
import { getPostBySlug, getRelatedPosts, getRecentPosts } from "@/content/blogPosts";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock } from "lucide-react";

function renderMarkdown(md: string) {
  const blocks = md.trim().split(/\n\n+/);
  return blocks.map((block, i) => {
    if (block.startsWith("## ")) {
      return <h2 key={i} className="font-display text-2xl md:text-3xl font-bold mt-10 mb-4">{block.slice(3)}</h2>;
    }
    if (/^-\s+/m.test(block)) {
      const items = block.split(/\n/).filter(l => l.trim().startsWith("-"));
      return (
        <ul key={i} className="list-disc list-outside pl-6 space-y-2 my-4 text-muted-foreground">
          {items.map((li, j) => <li key={j}>{inline(li.replace(/^-\s+/, ""))}</li>)}
        </ul>
      );
    }
    return <p key={i} className="my-4 text-muted-foreground leading-relaxed">{inline(block)}</p>;
  });
}

function inline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) {
      const isInternal = m[2].startsWith("/");
      parts.push(isInternal
        ? <Link key={key++} to={m[2]} className="text-primary underline underline-offset-2">{m[1]}</Link>
        : <a key={key++} href={m[2]} className="text-primary underline underline-offset-2">{m[1]}</a>);
    } else if (m[3]) {
      parts.push(<strong key={key++} className="text-foreground font-semibold">{m[3]}</strong>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) return <Navigate to="/blog" replace />;

  const related = getRelatedPosts(post);
  const recent = getRecentPosts(post.slug);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: post.publishedDate,
    dateModified: post.updatedDate || post.publishedDate,
    image: post.coverImage,
    description: post.metaDescription,
    author: { "@type": "Organization", name: "Citivas" },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title={`${post.title} | Citivas`}
        description={post.metaDescription}
        canonicalUrl={`/blog/${post.slug}`}
        ogType="article"
        ogImage={post.coverImage}
        keywords={[post.category, post.city].filter(Boolean) as string[]}
        structuredData={[faqSchema, articleSchema]}
      />

      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl font-bold">Citivas</Link>
          <Button asChild variant="ghost" size="sm"><Link to="/blog"><ArrowLeft className="w-4 h-4 mr-1" /> Blog</Link></Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 grid lg:grid-cols-[1fr_320px] gap-12 max-w-7xl">
        {/* Main content */}
        <article>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-8">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(post.publishedDate).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {post.readingMinutes} min read
            </span>
            {post.updatedDate && (
              <>
                <span>·</span>
                <span>Updated {new Date(post.updatedDate).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}</span>
              </>
            )}
          </div>

          {post.coverImage && (
            <div className="relative w-full rounded-2xl mb-8 overflow-hidden max-h-[500px]">
              <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <span className="text-xs font-bold uppercase tracking-wide text-white/80">{post.category}</span>
                <h1 className="font-display text-2xl md:text-4xl font-extrabold mt-1 text-white leading-tight">
                  {post.title}
                </h1>
              </div>
            </div>
          )}

          <div className="prose prose-lg max-w-none text-foreground">
            {renderMarkdown(post.body)}
          </div>

          {/* FAQ section */}
          {post.faq.length > 0 && (
            <section className="mt-16 border-t border-border pt-10">
              <h2 className="font-display text-2xl font-bold mb-6 text-foreground">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {post.faq.map((item, i) => (
                  <details key={i} className="group rounded-xl border border-border bg-card p-4">
                    <summary className="cursor-pointer font-semibold text-foreground list-none flex justify-between items-center">
                      {item.q}
                      <span className="text-primary group-open:rotate-45 transition-transform text-xl">+</span>
                    </summary>
                    <p className="mt-3 text-muted-foreground leading-relaxed">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </article>

        {/* Sidebar */}
        <aside className="space-y-8">
          {related.length > 0 && (
            <div>
              <h3 className="font-display text-lg font-bold mb-4 text-foreground">Related Reads</h3>
              <div className="space-y-4">
                {related.map((p) => (
                  <Link key={p.slug} to={`/blog/${p.slug}`} className="flex gap-3 group">
                    {p.coverImage && (
                      <img src={p.coverImage} alt={p.title} className="w-20 h-20 object-cover rounded-lg shrink-0" />
                    )}
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {p.title}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-display text-lg font-bold mb-4 text-foreground">Recent Posts</h3>
            <div className="space-y-3">
              {recent.map((p) => (
                <Link key={p.slug} to={`/blog/${p.slug}`} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                  {p.title}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-5 text-center">
            <p className="font-display font-bold text-foreground mb-2">Ready to book?</p>
            <p className="text-sm text-muted-foreground mb-4">Find and book verified venues, hotels and restaurants on Citivas.</p>
            <Link to="/explore" className="inline-block rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90">
              Explore Citivas
            </Link>
          </div>
        </aside>
      </div>

      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Citivas</p>
          <div className="flex gap-6"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div>
        </div>
        <p className="container mx-auto px-4 mt-4 text-center text-xs text-muted-foreground">
          A product of Bluewaves Technology and Software Development —{" "}
          <a href="https://bwtng.live" target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
            www.bwtng.live
          </a>
        </p>
      </footer>
    </div>
  );
}
