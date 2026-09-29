import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { blogPosts } from "@/content/blogPosts";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";

const CATEGORIES = ["All", "Event Centers", "Restaurants", "Hotels", "Recreation", "Travel Guide"] as const;

export default function BlogIndexPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const filteredPosts = useMemo(() => {
    if (selectedCategory === "All") return blogPosts;
    return blogPosts.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Citivas Blog — Nigeria Travel, Events & Hospitality Guides"
        description="Guides to the best event centers, restaurants, hotels and things to do across Lagos, Abuja, Port Harcourt and beyond."
        canonicalUrl="/blog"
      />

      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl font-bold">Citivas</Link>
          <Button asChild className="rounded-full"><Link to="/auth">Sign in</Link></Button>
        </div>
      </header>

      <section className="py-16 md:py-24 border-b border-border">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Field notes</div>
          <h1 className="font-display text-5xl md:text-6xl font-extrabold mb-4">The Citivas Journal</h1>
          <p className="text-muted-foreground text-lg">City guides, venue reviews, and how-to articles for navigating Nigeria's biggest cities.</p>
        </div>
      </section>

      {/* Category filter */}
      <section className="py-8 border-b border-border">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Posts grid */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          {filteredPosts.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No posts in this category yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => (
                <Link key={post.slug} to={`/blog/${post.slug}`} className="group">
                  {post.coverImage && (
                    <div className="relative w-full h-48 rounded-xl mb-4 overflow-hidden">
                      <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-white/80">{post.category}</span>
                        <h2 className="font-display text-sm font-bold text-white leading-tight line-clamp-2">
                          {post.title}
                        </h2>
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{post.metaDescription}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(post.publishedDate).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {post.readingMinutes} min
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

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
