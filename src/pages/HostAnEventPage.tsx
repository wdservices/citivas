import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Ticket, QrCode, Users, TrendingUp, Calendar, ArrowRight } from "lucide-react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import StampIcon from "@/components/StampIcon";

const steps = [
  { icon: Calendar, title: "Create your event", body: "Name, date, venue, ticket tiers. Under 3 minutes.", tone: "primary" as const, rotate: "-rotate-6" as const },
  { icon: Ticket, title: "Sell in-app", body: "Users pay via card, transfer or wallet. You get paid weekly.", tone: "accent" as const, rotate: "rotate-3" as const },
  { icon: QrCode, title: "Scan at the door", body: "Every ticket has a unique QR. Validate with the admin app.", tone: "success" as const, rotate: "-rotate-3" as const },
  { icon: TrendingUp, title: "Track & retarget", body: "See attendee analytics and promote your next event to buyers.", tone: "primary-dark" as const, rotate: "rotate-6" as const },
];

const valueProps = [
  { icon: Ticket, title: "Flat 8% commission", body: "No setup fees. Transparent pricing on every ticket sold.", tone: "primary" as const },
  { icon: QrCode, title: "QR door entry", body: "Unique codes per ticket. Instant validate at the gate.", tone: "accent" as const },
  { icon: Users, title: "Built-in audience", body: "50k+ active users already looking for their next night out.", tone: "success" as const },
];

const stats = [
  { value: "8%", label: "Commission per ticket" },
  { value: "\u20a6120M+", label: "Tickets sold on-platform" },
  { value: "24h", label: "Payout window" },
];

export default function HostAnEventPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Host an Event & Sell Tickets in Nigeria — Citivas"
        description="Sell tickets to your Lagos, Abuja or Port Harcourt event on Citivas. QR entry, weekly payouts, in-app promotion. 8% flat commission."
        canonicalUrl="/host-an-event"
        keywords={["sell event tickets nigeria", "lagos event platform", "qr ticketing nigeria"]}
      />

      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl font-bold">Citivas</Link>
          <Button asChild className="rounded-full"><Link to="/auth">Sign in</Link></Button>
        </div>
      </header>

      <section className="relative py-20 md:py-28 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/10 text-xs font-semibold uppercase tracking-wider mb-6">
            <Ticket className="w-3.5 h-3.5" /> Ticketing
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-extrabold leading-[1.02] mb-6">
            Host it. Sell it out.
          </h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            The easiest way to sell tickets to concerts, brunches, launches and members-only nights across Nigeria.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full bg-foreground text-background hover:bg-foreground/90 h-14 px-8 text-base font-semibold shadow-lg">
              <Link to="/profile/dashboard?tab=events&action=create&type=event">Create event <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-foreground/30 text-foreground bg-foreground/10 hover:bg-foreground/20 h-14 px-8 text-base font-semibold">
              <Link to="/event-tickets">Ticketing Dashboard</Link>
            </Button>
          </div>

          <div className="mt-14 grid grid-cols-3 gap-6 max-w-2xl mx-auto">
            {stats.map(s => (
              <div key={s.label}>
                <div className="font-display text-4xl md:text-5xl font-extrabold">{s.value}</div>
                <div className="text-sm opacity-80 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mb-14">
            <div className="text-xs font-bold text-accent uppercase tracking-widest mb-3">Why host with us</div>
            <h2 className="font-display text-4xl md:text-5xl font-extrabold">Three stamps worth collecting.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {valueProps.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group flex flex-col items-center text-center p-6"
              >
                <StampIcon icon={v.icon} tone={v.tone} size="lg" />
                <h3 className="font-display text-xl font-bold mt-5 mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground max-w-[240px]">{v.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mb-14">
            <div className="text-xs font-bold text-accent uppercase tracking-widest mb-3">How it works</div>
            <h2 className="font-display text-4xl md:text-5xl font-extrabold">From idea to sold-out, in one flow.</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group p-6 rounded-2xl bg-card border border-border shadow-soft"
              >
                <StampIcon icon={s.icon} tone={s.tone} size="md" rotate={s.rotate} className="mb-4" />
                <div className="text-xs font-mono text-muted-foreground mb-2">STEP {String(i + 1).padStart(2, "0")}</div>
                <h3 className="font-display text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24 bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <Users className="w-10 h-10 mx-auto text-primary mb-4" />
          <h2 className="font-display text-4xl md:text-5xl font-extrabold mb-4">Your audience is already here.</h2>
          <p className="text-lg opacity-80 mb-8 max-w-2xl mx-auto">
            50,000+ active users across Lagos, Abuja and Port Harcourt open Citivas every week looking for their next night out.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-8">
              <Link to="/profile/dashboard?tab=events&action=create&type=event">Start selling tickets</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full h-14 px-8">
              <Link to="/event-tickets">View Ticketing Hub</Link>
            </Button>
          </div>
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
