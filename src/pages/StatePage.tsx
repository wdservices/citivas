import { Link, useParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Hotel, Utensils, Calendar, ArrowRight } from "lucide-react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { STATES, stateBySlug } from "@/content/states";

export default function StatePage() {
  const { stateSlug } = useParams<{ stateSlug: string }>();
  const state = stateSlug ? stateBySlug(stateSlug) : null;

  if (!state) return <Navigate to="/" replace />;

  const canonical = `/nigeria/${state.slug}`;
  const jsonLd = state.populated
    ? [
        {
          "@context": "https://schema.org",
          "@type": "TouristDestination",
          name: state.cityLabel,
          description: state.intro.slice(0, 240),
          containedInPlace: { "@type": "Country", name: "Nigeria" },
        },
        state.faq.length && {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: state.faq.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        },
      ].filter(Boolean) as any
    : undefined;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title={`${state.cityLabel} Guide — Best Hotels, Restaurants & Events | Citivas`}
        description={`Discover the best of ${state.cityLabel}: hotels, restaurants, events and hidden gems curated by locals on Citivas.`}
        canonicalUrl={canonical}
        keywords={[`${state.cityLabel} hotels`, `${state.cityLabel} restaurants`, `${state.cityLabel} events`, `things to do in ${state.cityLabel}`]}
        robots={state.populated ? "index, follow" : "noindex, follow"}
        structuredData={jsonLd}
      />

      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl font-bold">Citivas</Link>
          <nav className="hidden md:flex items-center gap-5 text-sm">
            {STATES.filter(s => s.populated).map(s => (
              <Link key={s.slug} to={`/nigeria/${s.slug}`}
                className={`hover:text-primary ${s.slug === state.slug ? 'text-primary font-semibold' : ''}`}>
                {s.cityLabel}
              </Link>
            ))}
          </nav>
          <Button asChild className="rounded-full"><Link to="/auth">Sign in</Link></Button>
        </div>
      </header>

      {!state.populated ? (
        <section className="py-32 text-center container mx-auto px-4 max-w-2xl">
          <h1 className="font-display text-5xl font-extrabold mb-4">{state.hero}</h1>
          <p className="text-muted-foreground mb-8">{state.intro}</p>
          <Button asChild className="rounded-full"><Link to="/">Back to Citivas</Link></Button>
        </section>
      ) : (
        <>
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-muted -z-10" />
            <div className="container mx-auto px-4 py-20 md:py-28">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 text-primary text-xs font-semibold uppercase tracking-wider mb-6">
                  <MapPin className="w-3.5 h-3.5" /> Nigeria \u2022 {state.name}
                </div>
                <h1 className="font-display text-5xl md:text-7xl font-extrabold leading-[1.02] mb-6 max-w-4xl">
                  {state.hero}
                </h1>
                <p className="text-lg text-muted-foreground max-w-3xl">{state.intro}</p>
              </motion.div>
            </div>
          </section>

          {state.neighborhoods.length > 0 && (
            <section className="py-14 border-y border-border bg-muted/40">
              <div className="container mx-auto px-4">
                <h2 className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Neighbourhoods</h2>
                <div className="flex flex-wrap gap-3">
                  {state.neighborhoods.map(n => (
                    <span key={n} className="px-4 py-2 rounded-full bg-card border border-border text-sm font-medium">{n}</span>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="py-20 md:py-24">
            <div className="container mx-auto px-4">
              <h2 className="font-display text-4xl md:text-5xl font-extrabold mb-14">Explore {state.cityLabel}</h2>
              <div className="grid sm:grid-cols-3 gap-x-8 gap-y-14">
                {[
                  { icon: Hotel, title: `Best hotels in ${state.cityLabel}`, to: "/hotels", body: "Luxury, boutique and business hotels\u2014verified by Citivas.", ring: 'border-primary text-primary', rotate: '-rotate-3' },
                  { icon: Utensils, title: `Where to eat in ${state.cityLabel}`, to: "/restaurants", body: "From street kitchens to fine dining rooms.", ring: 'border-accent text-accent', rotate: 'rotate-2' },
                  { icon: Calendar, title: `What\u2019s on in ${state.cityLabel}`, to: "/events", body: "Concerts, brunches, launches and members-only nights.", ring: 'border-success text-success', rotate: '-rotate-2' },
                ].map(c => {
                  const [ringBorder, ringText] = c.ring.split(' ');
                  return (
                    <Link key={c.title} to={c.to} className={`group flex flex-col items-center text-center ${c.rotate} hover:rotate-0 transition-transform duration-300`}>
                      <div className={`relative flex items-center justify-center w-24 h-24 rounded-full border-2 border-dashed ${ringBorder}/50 mb-5 group-hover:${ringBorder} transition-colors`}>
                        <div className={`absolute inset-2 rounded-full border ${ringBorder}/20`} />
                        <c.icon className={`w-8 h-8 ${ringText}`} />
                      </div>
                      <h3 className="font-display text-xl font-bold mb-2">{c.title}</h3>
                      <p className="text-muted-foreground text-sm mb-4 max-w-[240px]">{c.body}</p>
                      <span className={`text-sm font-semibold ${ringText} inline-flex items-center gap-1`}>
                        Explore <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>

          {state.faq.length > 0 && (
            <section className="py-20 border-t border-border bg-muted/40">
              <div className="container mx-auto px-4 max-w-3xl">
                <h2 className="font-display text-4xl font-extrabold mb-10">FAQ — {state.cityLabel}</h2>
                <div className="space-y-4">
                  {state.faq.map(item => (
                    <details key={item.q} className="group p-5 rounded-2xl bg-card border border-border">
                      <summary className="cursor-pointer list-none flex justify-between items-center font-semibold">
                        {item.q}
                        <span className="text-primary transition-transform group-open:rotate-45 text-2xl leading-none">+</span>
                      </summary>
                      <p className="mt-3 text-muted-foreground">{item.a}</p>
                    </details>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Citivas</p>
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
