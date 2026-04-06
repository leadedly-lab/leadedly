import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck, ShieldOff, KeyRound, QrCode,
  CheckCircle2, Copy, AlertTriangle, RefreshCw, Eye, EyeOff
} from "lucide-react";

type MfaStatus = { mfaEnabled: boolean; backupCodesRemaining: number };

export default function AdminMfa() {
  const { auth } = useAuth();
  const { toast } = useToast();
  const adminId = auth?.user?.id;

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [setupStep, setSetupStep] = useState<"idle" | "scan" | "verify" | "done">("idle");
  const [verifyToken, setVerifyToken] = useState("");
  const [disableToken, setDisableToken] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const { data: mfaStatus, refetch } = useQuery<MfaStatus>({
    queryKey: [`/api/auth/mfa-status/${adminId}`],
    enabled: !!adminId,
  });

  // Start MFA setup
  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/mfa-setup", { adminId });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setQrDataUrl(data.qrDataUrl);
      setSecret(data.secret);
      setSetupStep("scan");
    },
    onError: (e: any) => toast({ title: "Setup failed", description: e.message, variant: "destructive" }),
  });

  // Enable MFA (verify first code)
  const enableMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/mfa-enable", { adminId, token: verifyToken.replace(/\s/g, "") });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setSetupStep("done");
      refetch();
      queryClient.invalidateQueries({ queryKey: [`/api/auth/mfa-status/${adminId}`] });
    },
    onError: (e: any) => {
      toast({ title: "Verification failed", description: e.message, variant: "destructive" });
      setVerifyToken("");
    },
  });

  // Disable MFA
  const disableMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/mfa-disable", { adminId, token: disableToken.replace(/\s/g, "") });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "MFA disabled" });
      setDisableToken("");
      setSetupStep("idle");
      refetch();
    },
    onError: (e: any) => {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
      setDisableToken("");
    },
  });

  function copyBackupCodes() {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold font-display text-foreground">Two-Factor Authentication</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Protect admin access with TOTP-based multi-factor authentication (Google Authenticator, Authy, etc.)
        </p>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> MFA Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mfaStatus?.mfaEnabled ? "bg-green-500/10" : "bg-muted"}`}>
                {mfaStatus?.mfaEnabled
                  ? <ShieldCheck className="w-5 h-5 text-green-400" />
                  : <ShieldOff className="w-5 h-5 text-muted-foreground" />
                }
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">
                  {mfaStatus?.mfaEnabled ? "MFA Enabled" : "MFA Not Enabled"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {mfaStatus?.mfaEnabled
                    ? `${mfaStatus.backupCodesRemaining} backup code${mfaStatus.backupCodesRemaining !== 1 ? "s" : ""} remaining`
                    : "Admin account is protected by password only"}
                </p>
              </div>
            </div>
            <Badge
              variant={mfaStatus?.mfaEnabled ? "default" : "secondary"}
              className="text-xs"
            >
              {mfaStatus?.mfaEnabled ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ── Setup Flow ── */}
      {!mfaStatus?.mfaEnabled && setupStep === "idle" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary" /> Enable MFA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Secure your admin account with a time-based one-time password (TOTP). You'll need an authenticator app
              like <strong className="text-foreground">Google Authenticator</strong> or <strong className="text-foreground">Authy</strong>.
            </p>
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
              <strong className="text-foreground">Required for Plaid production access.</strong> Plaid requires MFA on
              all admin accounts with access to systems that process consumer financial data.
            </div>
            <Button onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending} data-testid="button-start-mfa-setup">
              <ShieldCheck className="w-4 h-4 mr-2" />
              {setupMutation.isPending ? "Generating…" : "Set up MFA"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Scan QR */}
      {setupStep === "scan" && qrDataUrl && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary" /> Step 1 — Scan QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Open your authenticator app and scan the QR code below. The app will add a Leadedly entry.
            </p>
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-xl border border-border inline-block">
                <img src={qrDataUrl} alt="TOTP QR Code" className="w-48 h-48" />
              </div>
            </div>

            {/* Manual entry fallback */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Can't scan? Enter this key manually in your app:</p>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
                <code className="text-xs font-mono text-foreground flex-1 break-all">
                  {showSecret ? secret : secret?.replace(/./g, "•")}
                </code>
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {showSecret && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(secret || ""); toast({ title: "Key copied" }); }}
                    className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <Button className="w-full" onClick={() => setSetupStep("verify")} data-testid="button-next-verify">
              I've scanned it — continue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Verify first code */}
      {setupStep === "verify" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" /> Step 2 — Verify Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code shown in your authenticator app to confirm setup.
            </p>
            <div className="space-y-1.5">
              <Label className="text-sm">Authentication code</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="000 000"
                maxLength={7}
                value={verifyToken}
                onChange={e => setVerifyToken(e.target.value.replace(/[^0-9\s]/g, ""))}
                className="text-center text-xl tracking-widest font-mono h-12"
                autoFocus
                data-testid="input-verify-totp"
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => enableMutation.mutate()} disabled={enableMutation.isPending || verifyToken.replace(/\s/g, "").length < 6} data-testid="button-enable-mfa">
                {enableMutation.isPending ? "Verifying…" : "Enable MFA"}
              </Button>
              <Button variant="outline" onClick={() => setSetupStep("scan")}>Back</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Done — show backup codes */}
      {setupStep === "done" && backupCodes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-4 h-4" /> MFA Enabled Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-yellow-500/30 bg-yellow-500/5">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <AlertDescription className="text-sm text-yellow-300">
                Save these backup codes now. Each can only be used once and they won't be shown again.
                Store them somewhere safe — you'll need one if you lose access to your authenticator app.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-2 p-4 rounded-xl bg-muted/30 border border-border">
              {backupCodes.map((code, i) => (
                <code key={i} className="text-sm font-mono text-foreground text-center py-1 px-2 rounded bg-muted">
                  {code}
                </code>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={copyBackupCodes} data-testid="button-copy-backup-codes">
                {copiedCodes ? <><CheckCircle2 className="w-4 h-4 mr-2 text-green-400" /> Copied</> : <><Copy className="w-4 h-4 mr-2" /> Copy all codes</>}
              </Button>
              <Button onClick={() => { setSetupStep("idle"); setBackupCodes([]); refetch(); }} data-testid="button-mfa-done">
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Disable MFA ── */}
      {mfaStatus?.mfaEnabled && setupStep === "idle" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <ShieldOff className="w-4 h-4" /> Disable MFA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-500/30 bg-red-500/5">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <AlertDescription className="text-sm text-red-300">
                Disabling MFA reduces your account security and may violate Plaid's security requirements for production access.
              </AlertDescription>
            </Alert>
            <div className="space-y-1.5">
              <Label className="text-sm">Enter your current 6-digit code to confirm</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="000 000"
                maxLength={7}
                value={disableToken}
                onChange={e => setDisableToken(e.target.value.replace(/[^0-9\s]/g, ""))}
                className="text-center text-lg tracking-widest font-mono"
                data-testid="input-disable-totp"
              />
            </div>
            <Button
              variant="destructive"
              onClick={() => disableMutation.mutate()}
              disabled={disableMutation.isPending || disableToken.replace(/\s/g, "").length < 6}
              data-testid="button-disable-mfa"
            >
              {disableMutation.isPending ? "Disabling…" : "Disable MFA"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
