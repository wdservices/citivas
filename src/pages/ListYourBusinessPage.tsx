import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, TrendingUp, ShieldCheck, BarChart3, Check, ArrowRight } from "lucide-react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import StampIcon from "@/components/StampIcon";

const plans = [
  {
    name: "Basic",
    price: "\u20a60",
    period: "/mo",
    tag: "Get discovered",
    features: ["Verified listing", "Google-indexed page", "Reviews & ratings", "Basic analytics"],
    cta: "List for free",
    highlighted: false,
  },
  {
    name: "Featured",
    price: "\u20a615,000",
    period: "/mo",
    tag: "Top of search",
    features: ["Everything in Basic", "Featured placement", "3 category badges", "Priority reviews", "Direct booking"],
    cta: "Go featured",
    highlighted: true,
  },
  {
    name: "Premium",
    price: "\u20a640,000",
    period: "/mo",
    tag: "Full concierge",
    features: ["Everything in Featured", "Homepage rotation", "Dedicated ads manager", "Ticketing enabled", "Custom analytics"],
    cta: "Talk to sales",
    highlighted: false,
  },
];

const value = [
  { icon: TrendingUp, title: "Reach across Nigeria", body: "Indexed on Google. Featured across Lagos, Abuja and Port Harcourt city pages.", tone: "primary" as const },
  { icon: ShieldCheck, title: "Verified trust", body: "Every business gets a verified badge. Real reviews from real diners and guests.", tone: "success" as const },
  { icon: BarChart3, title: "Own the analytics", body: "See page views, saves, direct bookings and review sentiment — updated live.", tone: "accent" as const },
];

export default function ListYourBusinessPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="List Your Business in Nigeria — Citivas"
        description="Get your restaurant, hotel, short-let or event business discovered on Citivas. Verified listings across Lagos, Abuja and Port Harcourt. Featured placement, direct booking and analytics."
        canonicalUrl="/list-your-business"
        keywords={["list restaurant nigeria", "hotel listing lagos", "business directory nigeria"]}
      />

      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl font-bold">Citivas</Link>
          <Button asChild className="rounded-full"><Link to="/auth">Sign in</Link></Button>
        </div>
      </header>

      <section className="py-20 md:py-28 border-b border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-muted -z-10" />
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/15 text-accent text-xs font-semibold uppercase tracking-wider mb-6">
            <Building2 className="w-3.5 h-3.5" /> For businesses
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-extrabold leading-[1.02] mb-6">
            Nigeria\u2019s best places<br/>
            <span className="text-primary">get discovered here.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            List your restaurant, hotel, event or short-let on Citivas. Get in front of urban Nigerians actively looking for what you sell.
          </p>
          <Button asChild size="lg" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-8 text-base font-semibold">
            <Link to="/business-listing">Start listing <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            {value.map((v, i) => (
              <motion.div key={v.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-8 rounded-2xl bg-card border border-border shadow-soft flex flex-col items-start">
                <StampIcon icon={v.icon} tone={v.tone} size="md" className="mb-4" />
                <h3 className="font-display text-2xl font-bold mb-2">{v.title}</h3>
                <p className="text-muted-foreground">{v.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24 bg-muted/40 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl md:text-5xl font-extrabold mb-3">Plans that grow with you.</h2>
            <p className="text-muted-foreground">No lock-in. Cancel anytime.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {plans.map(p => (
              <div key={p.name}
                className={`p-8 rounded-3xl border shadow-card flex flex-col ${p.highlighted ? "bg-secondary text-secondary-foreground border-secondary" : "bg-card border-border"}`}>
                <div className="text-xs font-bold uppercase tracking-widest mb-3 opacity-70">{p.tag}</div>
                <h3 className="font-display text-3xl font-extrabold mb-1">{p.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="font-display text-4xl font-extrabold">{p.price}</span>
                  <span className="opacity-70">{p.period}</span>
                </div>
                <ul className="space-y-3 flex-1 mb-6">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${p.highlighted ? 'text-primary' : 'text-success'}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className={`rounded-full h-12 ${p.highlighted ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
                  variant={p.highlighted ? "default" : "outline"}>
                  <Link to="/business-listing">{p.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="font-display text-4xl font-extrabold mb-4">Ready in under 5 minutes.</h2>
          <p className="text-muted-foreground mb-8">Photos, hours, contact and location. Our team reviews and publishes within 24 hours.</p>
          <Button asChild size="lg" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 h-14 px-8">
            <Link to="/business-listing">Create my listing</Link>
          </Button>
        </div>
      </section>

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
