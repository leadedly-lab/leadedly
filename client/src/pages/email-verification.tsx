import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { LeadedlyLogo } from "@/components/logo";
import { MailCheck, RefreshCw, ShieldCheck } from "lucide-react";

interface EmailVerificationProps {
  clientId: number;
  email: string;
  firstName?: string;
  // "signup" = first-time verification after onboarding
  // "login"  = blocked at login because not yet verified
  mode: "signup" | "login";
  onVerified: (authData: any) => void;
  onBack?: () => void;
}

export default function EmailVerification({
  clientId, email, firstName, mode, onVerified, onBack
}: EmailVerificationProps) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/verify-email", {
        clientId,
        code: code.trim(),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: "Email verified!", description: "Welcome to Leadedly." });
      onVerified(data);
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await apiRequest("POST", "/api/auth/verify-email-resend", { clientId });
      toast({ title: "New code sent", description: `Check ${email}` });
      setCode("");
      startCooldown();
    } catch (err: any) {
      toast({ title: "Failed to resend", description: err.message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  }

  function startCooldown() {
    setResendCooldown(30);
    const iv = setInterval(() => {
      setResendCooldown(c => {
        if (c <= 1) { clearInterval(iv); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <LeadedlyLogo size={32} />
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-lg">
          {/* Icon + heading */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <MailCheck className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold font-display text-foreground">
              {mode === "signup" ? "Verify your email" : "Email verification required"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "signup"
                ? "We sent a 6-digit verification code to"
                : "Your email hasn't been verified yet. We sent a new code to"}
            </p>
            <p className="font-semibold text-foreground text-sm">{email}</p>
          </div>

          {/* Code input */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Verification code</Label>
              <Input
                data-testid="input-verify-code"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                required
                autoFocus
                className="h-12 text-center text-2xl tracking-[0.5em] font-mono"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || code.length < 6}
              data-testid="button-verify-email"
            >
              {loading ? "Verifying…" : "Verify Email & Continue"}
              {!loading && <ShieldCheck className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          {/* Resend + back */}
          <div className="flex flex-col items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground gap-2"
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              data-testid="button-resend-verification"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : resending ? "Sending…" : "Resend code"}
            </Button>
            {onBack && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={onBack}
              >
                ← Back to sign in
              </button>
            )}
          </div>

          <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground text-center">
            Didn't get it? Check your spam folder. The code expires in 24 hours.
          </div>
        </div>
      </div>
    </div>
  );
}
