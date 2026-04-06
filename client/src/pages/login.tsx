import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Shield, Users, DollarSign, ShieldCheck, Mail, RefreshCw, ExternalLink } from "lucide-react";
import { LeadedlyLogo } from "@/components/logo";

type LoginStep = "credentials" | "admin_mfa" | "client_otp";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<LoginStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Admin MFA state
  const [totpToken, setTotpToken] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [pendingAdminId, setPendingAdminId] = useState<number | null>(null);

  // Client OTP state
  const [otpCode, setOtpCode] = useState("");
  const [pendingClientId, setPendingClientId] = useState<number | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);

  // ── Step 1: Credentials ──────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.mfaRequired) {
        // Admin: needs TOTP
        setPendingAdminId(data.adminId);
        setStep("admin_mfa");
        return;
      }
      if (data.otpRequired) {
        // Client: needs email OTP
        setPendingClientId(data.clientId);
        setPendingEmail(data.email);
        setStep("client_otp");
        startResendCooldown();
        return;
      }
      setAuth(data);
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2a: Admin TOTP ───────────────────────────────────────────────────
  async function handleAdminMfa(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const body: any = { adminId: pendingAdminId };
      if (useBackupCode) body.backupCode = backupCode;
      else body.token = totpToken.replace(/\s/g, "");
      const res = await apiRequest("POST", "/api/auth/mfa-verify", body);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAuth(data);
    } catch (err: any) {
      toast({ title: "Authentication failed", description: err.message, variant: "destructive" });
      setTotpToken(""); setBackupCode("");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2b: Client Email OTP ─────────────────────────────────────────────
  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/otp-verify", {
        clientId: pendingClientId,
        code: otpCode.trim(),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAuth(data);
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
      setOtpCode("");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await apiRequest("POST", "/api/auth/otp-resend", { clientId: pendingClientId });
      toast({ title: "New code sent", description: `Check ${pendingEmail}` });
      setOtpCode("");
      startResendCooldown();
    } catch (err: any) {
      toast({ title: "Resend failed", description: err.message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  }

  function startResendCooldown() {
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown(c => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  // ── Shared left panel ─────────────────────────────────────────────────────
  const LeftPanel = () => (
    <div className="hidden lg:flex flex-col justify-between w-[520px] min-h-screen bg-sidebar p-12 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: "linear-gradient(hsl(217 91% 60%) 1px, transparent 1px), linear-gradient(90deg, hsl(217 91% 60%) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative z-10"><LeadedlyLogo size={36} /></div>
      <div className="relative z-10 space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Performance-Based Lead Generation</p>
          <h2 className="text-3xl font-bold text-foreground leading-tight font-display">
            Pay only when<br />leads close.
          </h2>
          <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
            Secure exclusive territories, receive fresh leads daily, and only pay a success fee when a lead converts to a paying client.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { icon: Shield, label: "Exclusive Territories", desc: "Own your city, own your leads" },
            { icon: Users, label: "Fresh Leads Daily", desc: "Real prospects delivered to your dashboard" },
            { icon: DollarSign, label: "Pay Per Close Only", desc: "No close = no fee. Simple as that." },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="relative z-10 flex items-center gap-3 text-xs text-muted-foreground">
          <span>© 2026 Leadedly.</span>
          <a href="/#/privacy" className="hover:text-primary transition-colors flex items-center gap-1">
            Privacy Policy <ExternalLink className="w-3 h-3" />
          </a>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <LeftPanel />

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8"><LeadedlyLogo size={28} /></div>

          {/* ── Step 1: Credentials ── */}
          {step === "credentials" && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-foreground font-display">Welcome back</h1>
                <p className="text-muted-foreground text-sm mt-1">Sign in to your Leadedly account</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm">Email address</Label>
                  <Input id="email" data-testid="input-email" type="email" placeholder="you@company.com"
                    value={email} onChange={e => setEmail(e.target.value)} required className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm">Password</Label>
                  <Input id="password" data-testid="input-password" type="password" placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required className="h-10" />
                </div>
                <Button type="submit" data-testid="button-login" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                  {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </form>
              <div className="mt-6 pt-6 border-t border-border text-center">
                <p className="text-sm text-muted-foreground">
                  New to Leadedly?{" "}
                  <button data-testid="link-signup" className="text-primary hover:underline font-medium"
                    onClick={() => setLocation("/onboard")}>
                    Start your free onboarding
                  </button>
                </p>
              </div>
              <div className="mt-6 p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1">Demo credentials</p>
                <p className="text-xs text-muted-foreground">Admin: admin@leadedly.com / admin123</p>
                <p className="text-xs text-muted-foreground">Client: complete onboarding first</p>
              </div>
            </>
          )}

          {/* ── Step 2a: Admin TOTP ── */}
          {step === "admin_mfa" && (
            <>
              <div className="mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground font-display">Two-factor authentication</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {useBackupCode ? "Enter one of your backup codes." : "Enter the 6-digit code from your authenticator app."}
                </p>
              </div>
              <form onSubmit={handleAdminMfa} className="space-y-4">
                {!useBackupCode ? (
                  <div className="space-y-1.5">
                    <Label className="text-sm">Authentication code</Label>
                    <Input data-testid="input-totp" type="text" inputMode="numeric" placeholder="000 000"
                      maxLength={7} value={totpToken} onChange={e => setTotpToken(e.target.value.replace(/[^0-9\s]/g, ""))}
                      required autoFocus className="h-10 text-center text-lg tracking-widest font-mono" />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-sm">Backup code</Label>
                    <Input data-testid="input-backup-code" type="text" placeholder="XXXX-XXXX"
                      value={backupCode} onChange={e => setBackupCode(e.target.value.toUpperCase())}
                      required autoFocus className="h-10 font-mono" />
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading} data-testid="button-mfa-verify">
                  {loading ? "Verifying…" : "Verify"}
                  {!loading && <ShieldCheck className="w-4 h-4 ml-2" />}
                </Button>
              </form>
              <div className="mt-4 flex flex-col gap-2 text-center">
                <button className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setUseBackupCode(!useBackupCode); setTotpToken(""); setBackupCode(""); }}>
                  {useBackupCode ? "Use authenticator app instead" : "Use a backup code instead"}
                </button>
                <button className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setStep("credentials"); setPendingAdminId(null); }}>
                  ← Back to sign in
                </button>
              </div>
            </>
          )}

          {/* ── Step 2b: Client Email OTP ── */}
          {step === "client_otp" && (
            <>
              <div className="mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground font-display">Check your email</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  We sent a 6-digit verification code to
                </p>
                <p className="font-semibold text-foreground text-sm mt-0.5">{pendingEmail}</p>
              </div>

              <form onSubmit={handleOtpVerify} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Verification code</Label>
                  <Input
                    data-testid="input-otp"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                    required
                    autoFocus
                    className="h-12 text-center text-2xl tracking-[0.5em] font-mono"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || otpCode.length < 6} data-testid="button-otp-verify">
                  {loading ? "Verifying…" : "Verify & Sign In"}
                  {!loading && <ShieldCheck className="w-4 h-4 ml-2" />}
                </Button>
              </form>

              <div className="mt-5 flex flex-col gap-3 items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground gap-2"
                  onClick={handleResend}
                  disabled={resending || resendCooldown > 0}
                  data-testid="button-resend-otp"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : resending ? "Sending…" : "Resend code"}
                </Button>
                <button className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setStep("credentials"); setPendingClientId(null); setOtpCode(""); }}>
                  ← Back to sign in
                </button>
              </div>

              <div className="mt-6 p-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
                Didn't get it? Check your spam folder. The code expires in 10 minutes.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
