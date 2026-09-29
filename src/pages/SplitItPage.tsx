import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Receipt, Users, Split, Send, Sparkles, Camera, Calculator, Share2, ArrowRight } from "lucide-react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import StampIcon from "@/components/StampIcon";

const steps = [
  { icon: Camera, title: "Snap the receipt", body: "One photo of the bill — no manual entry.", tone: "primary" as const, rotate: "-rotate-6" as const },
  { icon: Users, title: "Tag who ordered what", body: "Add friends by name or phone. Assign items in seconds.", tone: "accent" as const, rotate: "rotate-3" as const },
  { icon: Calculator, title: "Fair math, done", body: "VAT, service charge and tips are split proportionally.", tone: "success" as const, rotate: "-rotate-3" as const },
  { icon: Share2, title: "Share and settle", body: "Everyone pays in-app or via a shareable payment link.", tone: "primary-dark" as const, rotate: "rotate-6" as const },
];

const useCases = [
  { title: "Group dinners", body: "Ten people, one steakhouse bill, zero drama.", tone: "marigold" },
  { title: "Weekend getaways", body: "Airbnb, fuel, groceries — split across the whole trip.", tone: "coral" },
  { title: "Office lunches", body: "Managers pay ahead, teammates settle later.", tone: "palm" },
  { title: "Wedding after-parties", body: "Absorb the bar tab, split the food.", tone: "marigold" },
];

const faq = [
  { q: "Do all my friends need the Citivas app?", a: "No. You can send a payment link — they pay via card, transfer or USSD without an account." },
  { q: "How are service charge and VAT handled?", a: "Split It applies the charge proportionally to each person's items, so light eaters aren't overcharged." },
  { q: "Is there a fee?", a: "Split It is free for personal use. Businesses using it for table-side splitting pay a small transaction fee." },
];

export default function SplitItPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Citivas Split It",
      applicationCategory: "FinanceApplication",
      operatingSystem: "iOS, Android, Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Split It — Split Restaurant Bills in Seconds | Citivas"
        description="Split restaurant, Airbnb and group bills fairly with Citivas Split It. Snap the receipt, tag orders, share a payment link. Built for Nigeria."
        canonicalUrl="/split-it"
        keywords={["split bill nigeria", "split restaurant bill", "group payment app", "Citivas split it"]}
        structuredData={jsonLd}
      />

      {/* Nav */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl font-bold">Citivas</Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/nigeria/lagos" className="hover:text-primary">Lagos</Link>
            <Link to="/nigeria/abuja" className="hover:text-primary">Abuja</Link>
            <Link to="/nigeria/rivers" className="hover:text-primary">Port Harcourt</Link>
            <Link to="/marketplace" className="hover:text-primary">Marketplace</Link>
            <Link to="/blog" className="hover:text-primary">Blog</Link>
          </nav>
          <Button asChild className="rounded-full"><Link to="/auth">Sign in</Link></Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-muted -z-10" />
        <div className="container mx-auto px-4 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 text-primary text-xs font-semibold uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5" /> New in Citivas
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-extrabold leading-[1.02] mb-6">
              Split any bill.<br/>
              <span className="text-primary">Skip the drama.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mb-8">
              Snap the receipt. Tag who ordered what. Citivas handles the VAT, service charge and math — then sends everyone a payment link.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-8 text-base font-semibold">
                <Link to="/auth">Try Split It <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full h-14 px-8 text-base border-2">
                <a href="#how">How it works</a>
              </Button>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="relative">
            <div className="aspect-[4/5] rounded-3xl bg-card shadow-hero border border-border overflow-hidden p-6 flex flex-col">
              <div className="flex items-center gap-2 pb-4 border-b border-border">
                <Receipt className="w-5 h-5 text-primary" />
                <span className="font-display text-lg font-bold">Nkoyo\u2019s Kitchen — Table 7</span>
              </div>
              <ul className="mt-4 space-y-3 flex-1">
                {[
                  { name: "Ada", item: "Grilled snapper + rice", amt: "\u20a622,500" },
                  { name: "Kola", item: "Suya platter", amt: "\u20a618,000" },
                  { name: "Ife",  item: "Vegan bowl + juice",  amt: "\u20a615,200" },
                  { name: "Tola", item: "Steak + red wine",    amt: "\u20a641,000" },
                ].map(row => (
                  <li key={row.name} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">{row.name[0]}</div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.item}</div>
                    </div>
                    <div className="text-sm font-mono">{row.amt}</div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-sm text-muted-foreground">VAT + service split fairly</span>
                <Button size="sm" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
                  <Send className="w-4 h-4 mr-1" /> Send links
                </Button>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 rotate-6 bg-accent text-accent-foreground px-4 py-2 rounded-full text-xs font-bold shadow-card">
              4 friends \u2022 \u20a696,700
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 md:py-28 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mb-14">
            <div className="text-xs font-bold text-primary uppercase tracking-widest mb-3">How it works</div>
            <h2 className="font-display text-4xl md:text-5xl font-extrabold mb-4">Four steps. Zero spreadsheets.</h2>
            <p className="text-muted-foreground text-lg">The bill goes from waiter to settled in under two minutes.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <motion.div key={s.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group p-6 rounded-2xl bg-card border border-border shadow-soft">
                <StampIcon icon={s.icon} tone={s.tone} size="md" rotate={s.rotate} className="mb-4" />
                <div className="text-xs font-mono text-muted-foreground mb-2">STEP {String(i + 1).padStart(2, "0")}</div>
                <h3 className="font-display text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-20 md:py-28 bg-muted/40 border-y border-border">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-4xl md:text-5xl font-extrabold mb-12 max-w-2xl">Built for the way Nigerians actually eat, travel and party.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {useCases.map((u) => (
              <div key={u.title} className="p-6 rounded-2xl bg-card border border-border">
                <Split className={`w-6 h-6 mb-4 ${u.tone === 'coral' ? 'text-accent' : u.tone === 'palm' ? 'text-success' : 'text-primary'}`} />
                <h3 className="font-display text-lg font-bold mb-2">{u.title}</h3>
                <p className="text-sm text-muted-foreground">{u.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="font-display text-4xl font-extrabold mb-10">Questions, answered.</h2>
          <div className="space-y-4">
            {faq.map(item => (
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

      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between gap-4 text-sm">
          <p className="text-muted-foreground">© {new Date().getFullYear()} Citivas. Made in Nigeria.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-primary">Privacy</Link>
            <Link to="/terms" className="hover:text-primary">Terms</Link>
            <Link to="/blog" className="hover:text-primary">Blog</Link>
          </div>
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
