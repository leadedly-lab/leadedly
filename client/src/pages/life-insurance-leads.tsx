import { LeadedlyLogo } from "@/components/logo";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  Sun,
  Moon,
  Shield,
  DollarSign,
  MapPin,
  Users,
  CheckCircle2,
  TrendingUp,
  Lock,
  Wallet,
  ArrowRight,
} from "lucide-react";
export default function LifeInsuranceLeadsLanding() {
  const { theme, toggle } = useTheme();

  function goToOnboarding() {
    // Pre-select Life Insurance (industry ID 3) via sessionStorage
    // (hash routing doesn't handle query strings cleanly)
    try { sessionStorage.setItem("preselectIndustryId", "3"); } catch {}
    window.location.hash = "#/onboard";
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <LeadedlyLogo size={26} />
          <div className="flex items-center gap-3">
            <Button size="icon" variant="ghost" onClick={toggle}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button onClick={goToOnboarding} data-testid="nav-signup-btn">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Left: Copy */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <Shield className="w-3.5 h-3.5" />
                  EXCLUSIVE LIFE INSURANCE LEADS
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
                Stop Paying for Leads.
                <br />
                <span className="text-primary">Pay Only When Policies Close.</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Leadedly delivers exclusive life insurance leads to agents in protected territories.
                No monthly fees. No pay-per-lead charges. You only pay a small success fee when a
                lead actually buys a policy.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" onClick={goToOnboarding} data-testid="hero-signup-btn" className="text-base px-8">
                  Claim Your Territory
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => {
                  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
                }} className="text-base px-8">
                  See How It Works
                </Button>
              </div>
            </div>

            {/* Right: Dashboard Mockup */}
            <div className="relative">
              {/* Glow */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-primary/5 blur-3xl opacity-60 pointer-events-none" />

              {/* Browser frame */}
              <div className="relative rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/30">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                  <div className="ml-3 px-3 py-1 rounded bg-background/60 text-[10px] text-muted-foreground border border-border">
                    app.leadedly.com/dashboard
                  </div>
                </div>

                {/* Dashboard body */}
                <div className="p-5 space-y-4">
                  {/* Top stat cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border p-3 bg-background">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Leads This Month</div>
                      <div className="text-2xl font-bold">47</div>
                      <div className="text-[10px] text-green-600 flex items-center gap-1 mt-1">
                        <TrendingUp className="w-3 h-3" /> +18%
                      </div>
                    </div>
                    <div className="rounded-lg border border-border p-3 bg-background">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Policies Sold</div>
                      <div className="text-2xl font-bold">12</div>
                      <div className="text-[10px] text-green-600 flex items-center gap-1 mt-1">
                        <TrendingUp className="w-3 h-3" /> 25.5% close rate
                      </div>
                    </div>
                    <div className="rounded-lg border border-border p-3 bg-background">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Territory Balance</div>
                      <div className="text-2xl font-bold">$1,840</div>
                      <div className="text-[10px] text-muted-foreground mt-1">Auto-replenish on</div>
                    </div>
                  </div>

                  {/* Territory card */}
                  <div className="rounded-lg border border-border p-3 bg-background">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold">Harris County, TX</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">EXCLUSIVE</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">Life Insurance</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: "74%" }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>Deposit: $6,000</span>
                      <span>Remaining: $1,840</span>
                    </div>
                  </div>

                  {/* Recent leads list */}
                  <div className="rounded-lg border border-border bg-background">
                    <div className="px-3 py-2 border-b border-border text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                      Recent Leads
                    </div>
                    <div className="divide-y divide-border">
                      {[
                        { name: "Michael R.", city: "Austin", status: "Closed", amt: "$480", color: "text-green-600" },
                        { name: "Sarah K.", city: "Round Rock", status: "Contacted", amt: "—", color: "text-blue-600" },
                        { name: "James P.", city: "Austin", status: "New", amt: "—", color: "text-primary" },
                      ].map((lead, i) => (
                        <div key={i} className="px-3 py-2 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
                              {lead.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <div>
                              <div className="font-medium">{lead.name}</div>
                              <div className="text-[10px] text-muted-foreground">{lead.city}, TX</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-semibold ${lead.color}`}>{lead.status}</span>
                            <span className="text-[10px] text-muted-foreground w-10 text-right">{lead.amt}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="border-y border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-base mb-1">Pay Per Policy Sold</h3>
                <p className="text-sm text-muted-foreground">
                  40% of the annual premium as a success fee on each closed life insurance
                  policy. Pay nothing when a lead doesn't convert.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-base mb-1">100% Exclusive Leads</h3>
                <p className="text-sm text-muted-foreground">
                  Every lead goes to one agent only. Never shared, never resold, never competing
                  against five other quotes.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-base mb-1">Protected Territories</h3>
                <p className="text-sm text-muted-foreground">
                  Lock down a county or an entire state in your name. No other life insurance
                  agent on our platform can touch it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
        <div className="max-w-3xl mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Traditional lead generation burns a hole in your wallet before you close a single policy.
            Leadedly flips the model — we take the risk, you only pay when a deal closes.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="border border-border rounded-xl p-6 bg-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">1</div>
              <h3 className="font-semibold text-lg">Claim Your Territory</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pick the county or state you want to serve. Once you claim it, no other life insurance
              agent on Leadedly can take leads from that area.
            </p>
          </div>
          <div className="border border-border rounded-xl p-6 bg-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">2</div>
              <h3 className="font-semibold text-lg">Fund Your Territory Deposit</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Deposit funds into your territory via bank transfer. Deposits are based on population —
              smaller markets cost less, larger markets more. It's refundable and covers success fees.
            </p>
          </div>
          <div className="border border-border rounded-xl p-6 bg-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">3</div>
              <h3 className="font-semibold text-lg">We Send You Exclusive Leads</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our marketing engine generates life insurance leads in your territory and routes them
              directly to you — no competition, no bidding, no shared contacts.
            </p>
          </div>
          <div className="border border-border rounded-xl p-6 bg-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">4</div>
              <h3 className="font-semibold text-lg">Pay 40% Of The Annual Premium Per Policy Sold</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When a lead buys a policy, a success fee equal to 40% of the annual premium is
              deducted from your territory deposit. No sale? No charge. Simple.
            </p>
          </div>
        </div>
      </section>

      {/* How Deposits Work */}
      <section className="bg-card/50 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
                <Wallet className="w-3.5 h-3.5" />
                TERRITORY DEPOSITS EXPLAINED
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                How The Deposit Works
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed mb-6">
                Your territory deposit is your working balance. Think of it as a pre-funded
                account that automatically covers success fees when policies close — no invoices,
                no late payments, no missed sales.
              </p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Based on county population.</strong>{" "}
                    <span className="text-muted-foreground">
                      Deposits scale with county size. Rural counties start at $1,000. Mid-size
                      counties run $1,500–$4,000. Major metros run $6,000–$12,000. Statewide
                      territories range $3,500–$15,000. A $2,000 account minimum applies across
                      all your territories.
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Pays success fees automatically.</strong>{" "}
                    <span className="text-muted-foreground">
                      Each closed policy deducts 40% of the annual premium from your deposit — no
                      manual invoicing or chasing payments.
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Auto-replenish keeps leads flowing.</strong>{" "}
                    <span className="text-muted-foreground">
                      If your balance drops below $400, we automatically pull a replenishment via
                      ACH so leads never stop. You set the amount, you stay in control.
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Fully refundable.</strong>{" "}
                    <span className="text-muted-foreground">
                      Unused funds can be refunded if you ever decide to step back from a territory.
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Secure ACH via Stripe.</strong>{" "}
                    <span className="text-muted-foreground">
                      All deposits and replenishments flow through Stripe's bank-grade ACH system.
                      No credit card fees, no chargebacks.
                    </span>
                  </span>
                </li>
              </ul>
            </div>
            <div className="border border-border rounded-xl p-6 bg-background">
              <h3 className="font-semibold text-base mb-4">County Deposit Tiers</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-start pb-3 border-b border-border">
                  <div>
                    <div className="font-medium text-sm">Rural County (&lt;25K pop.)</div>
                  </div>
                  <div className="font-bold text-primary">$1,000</div>
                </div>
                <div className="flex justify-between items-start pb-3 border-b border-border">
                  <div>
                    <div className="font-medium text-sm">Small County (25K–75K)</div>
                  </div>
                  <div className="font-bold text-primary">$1,500</div>
                </div>
                <div className="flex justify-between items-start pb-3 border-b border-border">
                  <div>
                    <div className="font-medium text-sm">Mid County (75K–200K)</div>
                  </div>
                  <div className="font-bold text-primary">$2,500</div>
                </div>
                <div className="flex justify-between items-start pb-3 border-b border-border">
                  <div>
                    <div className="font-medium text-sm">Large County (200K–500K)</div>
                  </div>
                  <div className="font-bold text-primary">$4,000</div>
                </div>
                <div className="flex justify-between items-start pb-3 border-b border-border">
                  <div>
                    <div className="font-medium text-sm">Major County (500K–1M)</div>
                  </div>
                  <div className="font-bold text-primary">$6,000</div>
                </div>
                <div className="flex justify-between items-start pb-3 border-b border-border">
                  <div>
                    <div className="font-medium text-sm">Metro/Mega County (1M+)</div>
                  </div>
                  <div className="font-bold text-primary">$8,500 – $12,000</div>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-sm">Statewide Territory</div>
                    <div className="text-xs text-muted-foreground">entire state exclusivity</div>
                  </div>
                  <div className="font-bold text-primary">$3,500 – $15,000</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <p className="text-xs font-semibold text-foreground">$2,000 account minimum</p>
                <p className="text-xs text-muted-foreground">
                  Every Leadedly account requires at least $2,000 in total territory deposits. If you
                  claim a single rural county, you'll need to top up to the $2,000 floor or add a
                  second territory.
                </p>
                <p className="text-xs text-muted-foreground">
                  Exact pricing is auto-calculated based on Census 2024 county population data when
                  you select your territory.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Agents Choose Us */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="max-w-3xl mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Why Life Insurance Agents Choose Leadedly
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            The life insurance industry is saturated with lead sellers that take your money
            whether you close or not. We built Leadedly to fix that.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border border-border rounded-xl p-6">
            <Users className="w-6 h-6 text-primary mb-3" />
            <h3 className="font-semibold text-lg mb-2">No Shared Leads</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Other platforms sell the same lead to 3–5 agents, forcing you into a race. Every
              Leadedly lead is yours alone — no race, no callbacks wasted, no "I already talked
              to another agent."
            </p>
          </div>
          <div className="border border-border rounded-xl p-6">
            <TrendingUp className="w-6 h-6 text-primary mb-3" />
            <h3 className="font-semibold text-lg mb-2">Aligned Incentives</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We only make money when you close policies. That means we're obsessed with
              delivering high-intent leads that actually convert, not just volume to pad an
              invoice.
            </p>
          </div>
          <div className="border border-border rounded-xl p-6">
            <Lock className="w-6 h-6 text-primary mb-3" />
            <h3 className="font-semibold text-lg mb-2">Geographic Protection</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Once you claim a county or state, it's yours. We enforce territory exclusivity at the
              platform level — no other life insurance agent on Leadedly can intrude.
            </p>
          </div>
          <div className="border border-border rounded-xl p-6">
            <DollarSign className="w-6 h-6 text-primary mb-3" />
            <h3 className="font-semibold text-lg mb-2">Predictable Economics</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              40% of the annual premium as a success fee per closed policy. No tiered pricing,
              no surprise charges, no credit card fees. You only pay when a policy actually
              closes — keeping the economics aligned with your wins.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-primary/5 border-t border-border">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Ready to Claim Your Territory?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Secure your county or state before another agent locks it down. Onboarding takes about
            2 minutes — you'll pick your territory, set your deposit, and start receiving exclusive
            life insurance leads.
          </p>
          <Button size="lg" onClick={goToOnboarding} data-testid="final-signup-btn" className="text-base px-10 h-12">
            Start Your Application
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            No credit card required to sign up. Deposit only charged after you confirm your territory.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <LeadedlyLogo size={20} />
            <span>© {new Date().getFullYear()} Leadedly LLC. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#/privacy" className="hover:text-foreground">Privacy Policy</a>
            <a href="#/terms" className="hover:text-foreground">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
