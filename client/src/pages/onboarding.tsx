import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LeadedlyLogo } from "@/components/logo";
import {
  TrendingUp, BarChart2, Shield, Home, Building2, Calculator,
  Scale, Heart, Sun, Wrench, ArrowRight, ArrowLeft, CheckCircle2,
  MapPin, Users, DollarSign, Star, LayoutDashboard, Zap, AlertCircle, ChevronRight
} from "lucide-react";
import type { Industry } from "@shared/schema";

const ICON_MAP: Record<string, any> = {
  TrendingUp, BarChart2, Shield, Home, Building2, Calculator,
  Scale, Heart, Sun, Wrench,
};

const TEAM_OPTIONS = ["Just Me", "2–4", "5–8", "9+"];
const CITIES_OPTIONS = ["1 City", "2–3 Cities", "4–6 Cities", "7+ Cities"];
const SPEND_OPTIONS = ["$0 – Nothing yet", "$500 – $1,500/mo", "$1,500 – $5,000/mo", "$5,000 – $15,000/mo", "$15,000+/mo"];

const SLIDES = [
  {
    icon: MapPin,
    title: "Secure Your Territory",
    body: "When you join Leadedly, you lock in an exclusive territory by city and industry. No competitor in your space can claim the same city — it's yours alone.",
    color: "hsl(217 91% 60%)",
  },
  {
    icon: DollarSign,
    title: "Deposit Your Territory Fee",
    body: "A $2,000 deposit secures your first city. Additional cities are $1,250 each. This deposit is a working balance — it's not lost. It's used to pay success fees only when we generate closed business for you.",
    color: "hsl(38 92% 50%)",
  },
  {
    icon: LayoutDashboard,
    title: "Leads Arrive Daily",
    body: "Every morning, fresh leads appear in your dashboard — pre-qualified prospects in your territory, matched to your industry. You'll see their name, contact info, and key financial details.",
    color: "hsl(142 76% 36%)",
  },
  {
    icon: Zap,
    title: "Contact Within 1 Hour",
    body: "Speed-to-lead is everything. Research shows leads contacted within 1 hour are 7x more likely to close. As part of your agreement, leads must be actioned within 60 minutes of receipt.",
    color: "hsl(25 91% 54%)",
  },
  {
    icon: Star,
    title: "Pay Only on Closed Deals",
    body: "When you mark a lead as Closed in your dashboard, our success fee is automatically deducted from your deposit balance. No close = no charge. It's truly performance-based.",
    color: "hsl(271 81% 56%)",
  },
  {
    icon: AlertCircle,
    title: "Keep Your Balance Healthy",
    body: "When your deposit balance drops below $400, we'll pause new leads until you replenish. We'll also send an alert before that happens so you're never caught off guard.",
    color: "hsl(0 72% 51%)",
  },
];

type Step = "industry" | "city" | "team" | "cities" | "spend" | "name" | "company" | "phone" | "title" | "email" | "slides" | "done";

export default function OnboardingPage({ existingClient }: { existingClient?: any }) {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("industry");
  const [slideIndex, setSlideIndex] = useState(0);
  const [tosAgreed, setTosAgreed] = useState(false);

  const [form, setForm] = useState({
    industryId: existingClient?.industryId || 0,
    industryName: "",
    preferredCity: existingClient?.preferredCity || "",
    teamSize: existingClient?.teamSize || "",
    citiesServed: existingClient?.citiesServed || 1,
    monthlyLeadSpend: existingClient?.monthlyLeadSpend || "",
    firstName: existingClient?.firstName || "",
    lastName: existingClient?.lastName || "",
    companyName: existingClient?.companyName || "",
    phone: existingClient?.phone || "",
    jobTitle: existingClient?.jobTitle || "",
    email: existingClient?.email || "",
    password: "",
  });

  const { data: industries = [] } = useQuery<Industry[]>({ queryKey: ["/api/industries"] });

  // Pre-select industry from sessionStorage (set by landing pages before redirect)
  useEffect(() => {
    if (form.industryId || !industries.length) return;
    let preselectId = 0;
    try {
      const stored = sessionStorage.getItem("preselectIndustryId");
      if (stored) preselectId = Number(stored);
    } catch {}
    if (preselectId) {
      const ind = industries.find(i => i.id === preselectId);
      if (ind) {
        setForm(f => ({ ...f, industryId: ind.id, industryName: ind.name }));
        setStep("city"); // skip past the industry selection step
        try { sessionStorage.removeItem("preselectIndustryId"); } catch {}
      }
    }
  }, [industries]);

  const stepOrder: Step[] = ["industry", "city", "team", "cities", "spend", "name", "company", "phone", "title", "email", "slides", "done"];
  const stepIndex = stepOrder.indexOf(step);
  const totalSteps = 10; // questions only

  function next(s?: Step) { setStep(s || stepOrder[stepIndex + 1]); }
  function back() { setStep(stepOrder[stepIndex - 1]); }

  async function handleSubmit() {
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        companyName: form.companyName,
        jobTitle: form.jobTitle,
        industryId: form.industryId,
        teamSize: form.teamSize,
        citiesServed: form.citiesServed,
        monthlyLeadSpend: form.monthlyLeadSpend,
        onboardingCompleted: true,
        password: form.password || "demo123",
        passwordHash: form.password || "demo123",
        role: "client",
        tosAgreedAt: Date.now(),
      };

      let client;
      if (existingClient) {
        const res = await apiRequest("PATCH", `/api/clients/${existingClient.id}`, { ...payload, onboardingCompleted: true });
        client = await res.json();
      } else {
        const res = await apiRequest("POST", "/api/clients", payload);
        client = await res.json();
      }
      setAuth({ role: "client", user: client });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  const progressPct = Math.min(100, ((stepIndex) / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <LeadedlyLogo size={28} />
        {stepIndex <= 9 && (
          <div className="flex items-center gap-3">
            <div className="w-36 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-xs text-muted-foreground tabular">{stepIndex}/10</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">

          {/* STEP: Industry */}
          {step === "industry" && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Step 1 of 10</p>
                <h1 className="text-2xl font-bold font-display text-foreground">What is your industry?</h1>
                <p className="text-muted-foreground text-sm mt-1">Select your primary service or product category.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {industries.map(ind => {
                  const Icon = ICON_MAP[ind.icon] || TrendingUp;
                  const selected = form.industryId === ind.id;
                  return (
                    <button
                      key={ind.id}
                      data-testid={`card-industry-${ind.id}`}
                      className={`onboarding-card rounded-xl p-4 flex flex-col items-center gap-2.5 text-center transition-all duration-200 ${selected ? "selected" : ""}`}
                      onClick={() => {
                        setForm(f => ({ ...f, industryId: ind.id, industryName: ind.name }));
                        setTimeout(() => next(), 200);
                      }}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selected ? "bg-primary/25" : "bg-muted"}`}>
                        <Icon className={`w-5 h-5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <span className="text-xs font-medium text-foreground leading-tight">{ind.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP: City */}
          {step === "city" && (
            <div className="space-y-6 max-w-md">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Step 2 of 10</p>
                <h1 className="text-2xl font-bold font-display text-foreground">What is your preferred exclusive territory?</h1>
                <p className="text-muted-foreground text-sm mt-1">Enter the primary city you want to own for {form.industryName}.</p>
              </div>
              <div className="space-y-1.5">
                <Label>City name</Label>
                <Input
                  data-testid="input-city"
                  placeholder="e.g. Jacksonville, FL"
                  value={form.preferredCity}
                  onChange={e => setForm(f => ({ ...f, preferredCity: e.target.value }))}
                  className="h-11"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={back}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                <Button onClick={() => next()} disabled={!form.preferredCity.trim()}>
                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP: Team size */}
          {step === "team" && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Step 3 of 10</p>
                <h1 className="text-2xl font-bold font-display text-foreground">How many people need leads in your office?</h1>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TEAM_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    data-testid={`card-team-${opt}`}
                    className={`onboarding-card rounded-xl p-5 text-center font-semibold text-foreground transition-all duration-200 ${form.teamSize === opt ? "selected" : ""}`}
                    onClick={() => { setForm(f => ({ ...f, teamSize: opt })); setTimeout(() => next(), 200); }}
                  >
                    <div className="text-2xl font-bold text-primary mb-1">
                      {opt === "Just Me" ? "1" : opt.replace("–", "–")}
                    </div>
                    <div className="text-xs text-muted-foreground">{opt === "Just Me" ? "Just me" : "people"}</div>
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={back}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            </div>
          )}

          {/* STEP: Cities served */}
          {step === "cities" && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Step 4 of 10</p>
                <h1 className="text-2xl font-bold font-display text-foreground">How many cities do you serve?</h1>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CITIES_OPTIONS.map((opt, i) => (
                  <button
                    key={opt}
                    data-testid={`card-cities-${i}`}
                    className={`onboarding-card rounded-xl p-5 text-center transition-all duration-200 ${form.citiesServed === i + 1 ? "selected" : ""}`}
                    onClick={() => { setForm(f => ({ ...f, citiesServed: i + 1 })); setTimeout(() => next(), 200); }}
                  >
                    <div className="text-2xl font-bold text-primary mb-1">{opt.split(" ")[0]}</div>
                    <div className="text-xs text-muted-foreground">cit{i === 0 ? "y" : "ies"}</div>
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={back}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            </div>
          )}

          {/* STEP: Lead spend */}
          {step === "spend" && (
            <div className="space-y-6 max-w-lg">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Step 5 of 10</p>
                <h1 className="text-2xl font-bold font-display text-foreground">How much do you currently spend on lead generation per month?</h1>
              </div>
              <div className="space-y-2">
                {SPEND_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    data-testid={`card-spend-${opt}`}
                    className={`onboarding-card rounded-xl px-5 py-3.5 w-full text-left flex items-center justify-between font-medium text-sm text-foreground transition-all duration-200 ${form.monthlyLeadSpend === opt ? "selected" : ""}`}
                    onClick={() => { setForm(f => ({ ...f, monthlyLeadSpend: opt })); setTimeout(() => next(), 200); }}
                  >
                    {opt}
                    <ChevronRight className={`w-4 h-4 ${form.monthlyLeadSpend === opt ? "text-primary" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={back}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            </div>
          )}

          {/* STEP: Name */}
          {step === "name" && (
            <div className="space-y-6 max-w-md">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Step 6 of 10</p>
                <h1 className="text-2xl font-bold font-display text-foreground">What is your name?</h1>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>First name</Label>
                  <Input data-testid="input-first-name" placeholder="John" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label>Last name</Label>
                  <Input data-testid="input-last-name" placeholder="Smith" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={back}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                <Button onClick={() => next()} disabled={!form.firstName.trim() || !form.lastName.trim()}>Continue <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {/* STEP: Company */}
          {step === "company" && (
            <div className="space-y-6 max-w-md">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Step 7 of 10</p>
                <h1 className="text-2xl font-bold font-display text-foreground">What is your company name?</h1>
              </div>
              <div className="space-y-1.5">
                <Label>Company name</Label>
                <Input data-testid="input-company" placeholder="Acme Financial Group" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} autoFocus />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={back}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                <Button onClick={() => next()} disabled={!form.companyName.trim()}>Continue <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {/* STEP: Phone */}
          {step === "phone" && (
            <div className="space-y-6 max-w-md">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Step 8 of 10</p>
                <h1 className="text-2xl font-bold font-display text-foreground">Your phone number</h1>
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input data-testid="input-phone" type="tel" placeholder="(555) 000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} autoFocus />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={back}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                <Button onClick={() => next()} disabled={!form.phone.trim()}>Continue <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {/* STEP: Title */}
          {step === "title" && (
            <div className="space-y-6 max-w-md">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Step 9 of 10</p>
                <h1 className="text-2xl font-bold font-display text-foreground">What is your job title?</h1>
              </div>
              <div className="space-y-1.5">
                <Label>Job title</Label>
                <Input data-testid="input-title" placeholder="Wealth Manager" value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} autoFocus />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={back}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                <Button onClick={() => next()} disabled={!form.jobTitle.trim()}>Continue <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {/* STEP: Email */}
          {step === "email" && (
            <div className="space-y-6 max-w-md">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Step 10 of 10</p>
                <h1 className="text-2xl font-bold font-display text-foreground">Your email address</h1>
                <p className="text-muted-foreground text-sm mt-1">This will be your login email.</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input data-testid="input-email" type="email" placeholder="john@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label>Create a password</Label>
                  <Input data-testid="input-password" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                </div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  checked={tosAgreed}
                  onChange={e => setTosAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-border"
                  data-testid="checkbox-tos"
                />
                <span className="text-sm text-muted-foreground leading-relaxed">
                  I agree to the{" "}
                  <a href="#/terms" target="_blank" rel="noopener" className="text-primary hover:underline font-medium">Terms of Service</a>
                  {" "}and{" "}
                  <a href="#/privacy" target="_blank" rel="noopener" className="text-primary hover:underline font-medium">Privacy Policy</a>,
                  including the deposit structure, fee schedule, 1-hour contact requirement, and dispute procedures.
                </span>
              </label>
              <div className="flex gap-3">
                <Button variant="outline" onClick={back}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                <Button onClick={() => next()} disabled={!form.email.trim() || !tosAgreed}>Continue <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {/* STEP: Slides */}
          {step === "slides" && (
            <div className="space-y-6 max-w-xl">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">How it works</p>
                <h1 className="text-2xl font-bold font-display text-foreground">Here's what to expect</h1>
              </div>

              {/* Slide card */}
              {(() => {
                const slide = SLIDES[slideIndex];
                const Icon = slide.icon;
                return (
                  <div className="rounded-2xl border border-border bg-card p-8 space-y-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${slide.color}20` }}>
                      <Icon className="w-7 h-7" style={{ color: slide.color }} />
                    </div>
                    <h2 className="text-xl font-bold font-display text-foreground">{slide.title}</h2>
                    <p className="text-muted-foreground leading-relaxed">{slide.body}</p>
                  </div>
                );
              })()}

              {/* Dots */}
              <div className="flex items-center justify-center gap-2">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlideIndex(i)}
                    className={`slide-dot ${i === slideIndex ? "active" : ""}`}
                  />
                ))}
              </div>

              <div className="flex gap-3 justify-between">
                <Button variant="outline" onClick={() => {
                  if (slideIndex > 0) setSlideIndex(i => i - 1);
                  else back();
                }}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> {slideIndex === 0 ? "Back" : "Previous"}
                </Button>
                {slideIndex < SLIDES.length - 1 ? (
                  <Button onClick={() => setSlideIndex(i => i + 1)}>
                    Next <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} className="bg-primary">
                    Enter My Dashboard <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
