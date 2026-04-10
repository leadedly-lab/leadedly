import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { MapPin, Plus, Trash2, Building2, DollarSign, AlertTriangle, Landmark, Zap } from "lucide-react";
import { useLocation } from "wouter";
import type { Territory } from "@shared/schema";

type PlaidStatus = { configured: boolean; linked: boolean; item: any | null };

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

type TerritoryForm = { state: string; city: string };
type PricingInfo = { population: number | null; price: number; tier: string };

export default function TerritoryManager({ clientId }: { clientId: number }) {
  const { auth } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [addOpen, setAddOpen] = useState(false);
  const [depositPromptOpen, setDepositPromptOpen] = useState(false);
  const [pendingTerritories, setPendingTerritories] = useState<TerritoryForm[]>([{ state: "", city: "" }]);
  const [pendingPricing, setPendingPricing] = useState<(PricingInfo | null)[]>([null]);
  const [totalOwed, setTotalOwed] = useState(0);

  const { data: plaidStatus } = useQuery<PlaidStatus>({
    queryKey: [`/api/plaid/status/${clientId}`],
    enabled: !!clientId,
  });

  const { data: territories = [], isLoading } = useQuery<Territory[]>({
    queryKey: [`/api/territories/client/${clientId}`],
    enabled: !!clientId,
  });

  // Fetch pricing for a territory
  const fetchPricingForIndex = async (index: number, state: string, city: string) => {
    if (!state || !city.trim()) {
      setPendingPricing(p => { const n = [...p]; n[index] = null; return n; });
      return;
    }
    try {
      const res = await fetch(`/api/territory-pricing?state=${state}&city=${encodeURIComponent(city.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setPendingPricing(p => { const n = [...p]; n[index] = data; return n; });
      }
    } catch { /* ignore */ }
  };

  const addMutation = useMutation({
    mutationFn: async (items: TerritoryForm[]) => {
      for (let i = 0; i < items.length; i++) {
        await apiRequest("POST", "/api/territories", {
          clientId,
          industryId: auth?.user?.industryId ?? 1,
          state: items[i].state,
          city: items[i].city,
          depositBalance: 0,
          active: true,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/territories/client/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/stats/client/${clientId}`] });
      setAddOpen(false);
      const total = pendingPricing.reduce((sum, p) => sum + (p?.price ?? 0), 0);
      setTotalOwed(total);
      setDepositPromptOpen(true);
      setPendingTerritories([{ state: "", city: "" }]);
      setPendingPricing([null]);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function calcTotal() {
    return pendingPricing.reduce((sum, p) => sum + (p?.price ?? 0), 0);
  }

  function handleAdd() {
    const valid = pendingTerritories.every(t => t.state && t.city.trim());
    if (!valid) { toast({ title: "Please fill in all territory fields", variant: "destructive" }); return; }
    addMutation.mutate(pendingTerritories);
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Territory Manager</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your exclusive lead territories by city and industry.</p>
        </div>
        <Button data-testid="button-add-territory" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Territory
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      ) : territories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No territories yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">Secure your first exclusive city territory and start receiving leads from qualified prospects in your area.</p>
            <Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Your First Territory</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {territories.map(t => (
            <Card key={t.id} className="hover-elevate">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{t.city === "Statewide" ? `${t.state} — Entire State` : t.city}</p>
                      {t.city !== "Statewide" && <p className="text-xs text-muted-foreground">{t.state}</p>}
                      {t.city === "Statewide" && t.excludedCities && (() => { try { const cities = JSON.parse(t.excludedCities) as string[]; return cities.length > 0 ? <p className="text-xs text-amber-400 mt-0.5">Excludes {cities.join(", ")} (covered by other clients)</p> : null; } catch { return null; } })()}
                    </div>
                  </div>
                  <Badge variant={t.active ? "default" : "secondary"} className="text-xs">
                    {t.active ? "Active" : "Paused"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Territory Deposit</span>
                    <span className="font-medium text-foreground tabular">${t.depositAmount.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Current Balance</span>
                    <span className={`font-bold tabular ${t.depositBalance < 400 ? "text-red-400" : "text-green-400"}`}>
                      ${t.depositBalance.toFixed(2)}
                    </span>
                  </div>
                  {/* Balance bar */}
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${t.depositBalance < 400 ? "bg-red-500" : "bg-green-500"}`}
                      style={{ width: `${Math.min(100, (t.depositBalance / t.depositAmount) * 100)}%` }}
                    />
                  </div>
                </div>

                {t.depositBalance < 400 && (
                  <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    Balance below $400 — replenish via ACH
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Territory Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Add Territories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pricing is based on city population. Enter a city and tab out to see the price.
            </p>
            <div className="space-y-3">
              {pendingTerritories.map((t, i) => (
                <div key={i} className="flex gap-3 items-end">
                  <div className="w-28 space-y-1">
                    <Label className="text-xs">State</Label>
                    <Select value={t.state} onValueChange={v => { setPendingTerritories(p => p.map((x, idx) => idx === i ? { ...x, state: v } : x)); fetchPricingForIndex(i, v, t.city); }}>
                      <SelectTrigger data-testid={`select-state-${i}`}><SelectValue placeholder="State" /></SelectTrigger>
                      <SelectContent>
                        {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">City</Label>
                    <Input
                      data-testid={`input-city-${i}`}
                      placeholder="City name"
                      value={t.city}
                      onChange={e => setPendingTerritories(p => p.map((x, idx) => idx === i ? { ...x, city: e.target.value } : x))}
                      onBlur={() => fetchPricingForIndex(i, t.state, t.city)}
                    />
                    {pendingPricing[i] && (
                      <p className="text-xs text-primary font-medium">
                        ${pendingPricing[i]!.price.toLocaleString()} — {pendingPricing[i]!.tier}
                        {pendingPricing[i]!.population ? ` (${pendingPricing[i]!.population!.toLocaleString()} pop.)` : ""}
                      </p>
                    )}
                  </div>
                  {i > 0 && (
                    <Button size="icon" variant="ghost" onClick={() => { setPendingTerritories(p => p.filter((_, idx) => idx !== i)); setPendingPricing(p => p.filter((_, idx) => idx !== i)); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPendingTerritories(p => [...p, { state: "", city: "" }]); setPendingPricing(p => [...p, null]); }}
              data-testid="button-add-another-city"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Another City
            </Button>

            <div className="border-t border-border pt-3">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-foreground">Total deposit required</span>
                <span className="text-primary tabular">${calcTotal().toLocaleString()}</span>
              </div>
            </div>

            <Button className="w-full" onClick={handleAdd} disabled={addMutation.isPending} data-testid="button-confirm-territories">
              {addMutation.isPending ? "Adding…" : "Add Territories"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deposit Prompt Dialog — shown after adding territories */}
      <Dialog open={depositPromptOpen} onOpenChange={setDepositPromptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Fund Your Territory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Deposit required to activate</p>
              <p className="text-3xl font-bold text-primary tabular">${totalOwed.toLocaleString()}</p>
            </div>

            {plaidStatus?.linked ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Your bank account is linked. You can deposit now via ACH or do it later from the Bank Account page.
                </p>
                <div className="p-3 rounded-lg bg-muted/40 flex items-center gap-2 text-xs text-muted-foreground">
                  <Landmark className="w-4 h-4 text-primary flex-shrink-0" />
                  {plaidStatus.item?.institutionName} ••••{plaidStatus.item?.accountMask}
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => { setDepositPromptOpen(false); navigate("/bank"); }}
                  >
                    <Zap className="w-4 h-4 mr-2" /> Deposit Now via ACH
                  </Button>
                  <Button variant="outline" onClick={() => setDepositPromptOpen(false)}>Later</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Link your checking account to fund territories instantly via ACH — no credit cards, no chargebacks.
                </p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => { setDepositPromptOpen(false); navigate("/bank"); }}
                  >
                    <Landmark className="w-4 h-4 mr-2" /> Link Bank & Deposit
                  </Button>
                  <Button variant="outline" onClick={() => setDepositPromptOpen(false)}>Later</Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
