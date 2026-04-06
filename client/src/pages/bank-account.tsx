import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PlaidLinkButton } from "@/components/plaid-link";
import type { Territory } from "@shared/schema";
type PlaidTransfer = { id: number; clientId: number; territoryId: number; transferId: string; amount: number; status: string; type: string; description: string; isAutoReplenish: boolean; createdAt: number; settledAt: number | null };
import {
  Landmark, RefreshCw, Trash2, CheckCircle2, AlertTriangle,
  ArrowUpCircle, Clock, XCircle, Zap, DollarSign, Settings2, Info, Lock
} from "lucide-react";

type PlaidStatus = {
  configured: boolean;
  linked: boolean;
  otpVerified: boolean;
  item: {
    accountName: string;
    accountMask: string;
    institutionName: string;
    autoReplenishEnabled: boolean;
    replenishAmount: number;
  } | null;
};

function TransferStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: any; icon: any }> = {
    pending: { label: "Pending", variant: "secondary", icon: Clock },
    posted: { label: "Posted", variant: "outline", icon: ArrowUpCircle },
    settled: { label: "Settled", variant: "default", icon: CheckCircle2 },
    failed: { label: "Failed", variant: "destructive", icon: XCircle },
    cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
    returned: { label: "Returned", variant: "destructive", icon: XCircle },
  };
  const config = map[status] || map.pending;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="flex items-center gap-1 text-xs">
      <Icon className="w-3 h-3" /> {config.label}
    </Badge>
  );
}

export default function BankAccount({ clientId }: { clientId: number }) {
  const { toast } = useToast();
  const [depositOpen, setDepositOpen] = useState(false);
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState("1000");
  const [replenishAmount, setReplenishAmount] = useState("1000");
  const [autoReplenishEnabled, setAutoReplenishEnabled] = useState(true);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const { data: plaidStatus, isLoading: statusLoading } = useQuery<PlaidStatus>({
    queryKey: [`/api/plaid/status/${clientId}`],
    enabled: !!clientId,
  });

  useEffect(() => {
    if (plaidStatus?.item) {
      setAutoReplenishEnabled(plaidStatus.item.autoReplenishEnabled);
      setReplenishAmount(String(plaidStatus.item.replenishAmount));
    }
  }, [plaidStatus?.item?.autoReplenishEnabled, plaidStatus?.item?.replenishAmount]);

  const { data: territories = [] } = useQuery<Territory[]>({
    queryKey: [`/api/territories/client/${clientId}`],
    enabled: !!clientId,
  });

  const { data: transfers = [] } = useQuery<PlaidTransfer[]>({
    queryKey: [`/api/plaid/transfers/${clientId}`],
    enabled: !!clientId,
  });

  // ACH Deposit mutation
  const depositMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/plaid/deposit", {
        clientId,
        territoryId: Number(selectedTerritoryId),
        amount: Number(depositAmount),
        isAutoReplenish: false,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/territories/client/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/plaid/transfers/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/client/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/stats/client/${clientId}`] });
      setDepositOpen(false);
      toast({
        title: "ACH deposit initiated",
        description: `$${Number(depositAmount).toFixed(2)} will be debited from your bank account. Status: ${data.status}`,
      });
    },
    onError: (e: any) => toast({ title: "Deposit failed", description: e.message, variant: "destructive" }),
  });

  // Unlink bank mutation
  const unlinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/plaid/unlink/${clientId}`, undefined);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/plaid/status/${clientId}`] });
      toast({ title: "Bank account unlinked" });
    },
  });

  // Save replenish settings
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/plaid/replenish-settings/${clientId}`, {
        autoReplenishEnabled,
        replenishAmount: Number(replenishAmount),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/plaid/status/${clientId}`] });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
      toast({ title: "Auto-replenish settings saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Manual replenish check
  const replenishCheckMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/plaid/check-replenish/${clientId}`, {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/territories/client/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/plaid/transfers/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/client/${clientId}`] });
      if (data.triggered > 0) {
        toast({ title: `Auto-replenish triggered`, description: `${data.triggered} territory${data.triggered > 1 ? "s" : ""} replenished.` });
      } else {
        toast({ title: "All balances healthy", description: "No territories below $400 threshold." });
      }
    },
  });

  const lowBalanceTerritories = territories.filter(t => t.depositBalance < 400);

  if (statusLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold font-display text-foreground">Bank Account</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Link your bank account to fund territories via ACH. Auto-replenish keeps balances healthy automatically.
        </p>
      </div>

      {/* OTP session gate — Plaid Link is only accessible after email verification */}
      {plaidStatus && !plaidStatus.otpVerified && (
        <Alert className="border-yellow-500/30 bg-yellow-500/5">
          <Lock className="w-4 h-4 text-yellow-400" />
          <AlertDescription className="text-sm text-yellow-300">
            <strong className="text-yellow-200">Identity verification required.</strong> For your security, bank account access requires email verification each session. Please sign out and sign back in — a one-time code will be sent to your email.
          </AlertDescription>
        </Alert>
      )}

      {/* Plaid not configured warning */}
      {!plaidStatus?.configured && (
        <Alert className="border-yellow-500/30 bg-yellow-500/5">
          <Info className="w-4 h-4 text-yellow-400" />
          <AlertDescription className="text-sm text-yellow-300">
            Plaid credentials not configured. Add <code className="bg-muted px-1 rounded text-xs">PLAID_CLIENT_ID</code> and{" "}
            <code className="bg-muted px-1 rounded text-xs">PLAID_SECRET</code> to your <code className="bg-muted px-1 rounded text-xs">.env</code> file,
            then restart the server.
          </AlertDescription>
        </Alert>
      )}

      {/* Linked Bank Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Landmark className="w-4 h-4 text-primary" /> Linked Bank Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          {plaidStatus?.linked && plaidStatus.item ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Landmark className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{plaidStatus.item.institutionName}</p>
                    <p className="text-xs text-muted-foreground">
                      {plaidStatus.item.accountName} ••••{plaidStatus.item.accountMask}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Linked
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => unlinkMutation.mutate()}
                    disabled={unlinkMutation.isPending}
                    data-testid="button-unlink-bank"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* ACH Deposit Button */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => setDepositOpen(true)}
                  disabled={territories.length === 0 || !plaidStatus?.otpVerified}
                  data-testid="button-ach-deposit"
                  title={!plaidStatus?.otpVerified ? "Email verification required" : undefined}
                >
                  <DollarSign className="w-4 h-4 mr-2" /> Deposit Funds via ACH
                </Button>
                <Button
                  variant="outline"
                  onClick={() => replenishCheckMutation.mutate()}
                  disabled={replenishCheckMutation.isPending}
                  data-testid="button-check-replenish"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${replenishCheckMutation.isPending ? "animate-spin" : ""}`} />
                  Check & Replenish Now
                </Button>
              </div>

              {/* Low balance alerts */}
              {lowBalanceTerritories.length > 0 && (
                <Alert className="border-red-500/30 bg-red-500/5">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <AlertDescription className="text-sm text-red-300">
                    {lowBalanceTerritories.length} territory{lowBalanceTerritories.length > 1 ? "ies are" : " is"} below $400:{" "}
                    {lowBalanceTerritories.map(t => `${t.city}, ${t.state}`).join("; ")}.
                    {plaidStatus.item.autoReplenishEnabled
                      ? " Auto-replenish will trigger automatically."
                      : " Enable auto-replenish below to fund automatically."}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Landmark className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">No bank account linked</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Link your checking account to fund territories via ACH bank transfer. No credit cards accepted.
                </p>
              </div>
              <PlaidLinkButton
                clientId={clientId}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: [`/api/plaid/status/${clientId}`] })}
                className={!plaidStatus?.otpVerified ? "opacity-50 pointer-events-none" : ""}
              />
              {!plaidStatus?.otpVerified && (
                <p className="text-xs text-yellow-400 flex items-center gap-1 mt-2">
                  <Lock className="w-3 h-3" /> Sign out and back in to enable bank linking
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-Replenish Settings */}
      {plaidStatus?.linked && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Auto-Replenish Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-xs text-muted-foreground">
              When a territory's deposit balance drops below <strong className="text-foreground">$400</strong>, Leadedly will
              automatically initiate an ACH pull from your linked bank to top it back up.
            </p>

            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
              <div>
                <Label className="text-sm font-medium">Enable Auto-Replenish</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Automatically pull funds when balance falls below $400 per territory</p>
              </div>
              <Switch
                checked={autoReplenishEnabled}
                onCheckedChange={setAutoReplenishEnabled}
                data-testid="switch-auto-replenish"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Replenish Amount</Label>
              <p className="text-xs text-muted-foreground">How much to pull per territory when triggered</p>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    min="500"
                    max="10000"
                    step="250"
                    value={replenishAmount}
                    onChange={e => setReplenishAmount(e.target.value)}
                    className="pl-7"
                    data-testid="input-replenish-amount"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveSettingsMutation.mutate()}
                  disabled={saveSettingsMutation.isPending}
                  data-testid="button-save-replenish-settings"
                >
                  {settingsSaved ? (
                    <><CheckCircle2 className="w-4 h-4 mr-1 text-green-400" /> Saved</>
                  ) : (
                    <><Settings2 className="w-4 h-4 mr-1" /> Save</>
                  )}
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
              <strong className="text-foreground">How it works:</strong> Each time a lead is closed ($250 fee) or an OOC penalty ($40) 
              is charged, the affected territory's balance decreases. When it dips below $400, an ACH debit for your 
              replenish amount is automatically initiated from your linked bank account.
            </div>
          </CardContent>
        </Card>
      )}

      {/* ACH Transfer History */}
      {transfers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" /> ACH Transfer History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map(tx => (
                    <tr key={tx.id} className="border-b border-border last:border-0 hoverable">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-xs text-foreground">{tx.description}</p>
                          {tx.isAutoReplenish && (
                            <span className="text-xs text-primary flex items-center gap-1 mt-0.5">
                              <Zap className="w-3 h-3" /> Auto-replenish
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <TransferStatusBadge status={tx.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular text-green-400">
                        +${tx.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ACH Deposit Dialog */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deposit Funds via ACH</DialogTitle>
            <DialogDescription>
              Funds will be debited from your linked bank account via ACH and credited to the selected territory's balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Territory</Label>
              <Select value={selectedTerritoryId} onValueChange={setSelectedTerritoryId}>
                <SelectTrigger data-testid="select-territory-deposit">
                  <SelectValue placeholder="Select territory..." />
                </SelectTrigger>
                <SelectContent>
                  {territories.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.city}, {t.state}
                      {t.depositBalance < 400 && " ⚠️ Low Balance"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Deposit Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  min="100"
                  step="50"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  className="pl-7"
                  data-testid="input-deposit-amount"
                />
              </div>
            </div>
            {plaidStatus?.item && (
              <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground flex items-center gap-2">
                <Landmark className="w-4 h-4 text-primary flex-shrink-0" />
                Debit from: {plaidStatus.item.institutionName} {plaidStatus.item.accountName} ••••{plaidStatus.item.accountMask}
              </div>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setDepositOpen(false)}>Cancel</Button>
              <Button
                onClick={() => depositMutation.mutate()}
                disabled={!selectedTerritoryId || !depositAmount || depositMutation.isPending}
                data-testid="button-confirm-deposit"
              >
                {depositMutation.isPending ? "Processing..." : `Deposit $${Number(depositAmount).toFixed(2)}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
