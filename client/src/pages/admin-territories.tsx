import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, DollarSign, BarChart2, Plus, Trash2 } from "lucide-react";
import type { Territory, Client, Industry } from "@shared/schema";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export default function AdminTerritories() {
  const { toast } = useToast();
  const [depositOpen, setDepositOpen] = useState<Territory | null>(null);
  const [statsOpen, setStatsOpen] = useState<Territory | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [statsForm, setStatsForm] = useState({ monthlyAdSpend: "", monthlyLeadsGenerated: "", monthlyLeadRevenue: "" });
  const [newTerritory, setNewTerritory] = useState({ clientId: "", industryId: "", state: "", city: "", entireState: false });
  const [deleteTarget, setDeleteTarget] = useState<Territory | null>(null);
  const [pricingInfo, setPricingInfo] = useState<{ population: number | null; price: number; tier: string } | null>(null);

  const { data: territories = [], isLoading } = useQuery<Territory[]>({ queryKey: ["/api/territories"] });
  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: industries = [] } = useQuery<Industry[]>({ queryKey: ["/api/industries"] });

  const depositMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: number; amount: number }) => {
      const res = await apiRequest("POST", `/api/territories/${id}/deposit`, { amount, confirmedBy: "Admin" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/territories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setDepositOpen(null);
      setDepositAmount("");
      toast({ title: "Deposit recorded", description: "Territory balance has been updated." });
    },
  });

  const statsMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("POST", `/api/territories/${id}/stats`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/territories"] });
      setStatsOpen(null);
      toast({ title: "Territory stats updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/territories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/territories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setDeleteTarget(null);
      toast({ title: "Territory deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Fetch pricing when city/state changes
  const fetchPricing = async (state: string, city: string, entireState: boolean) => {
    if (!state) { setPricingInfo(null); return; }
    if (!entireState && !city.trim()) { setPricingInfo(null); return; }
    try {
      const cityParam = entireState ? "Statewide" : city.trim();
      const res = await fetch(`/api/territory-pricing?state=${state}&city=${encodeURIComponent(cityParam)}`);
      if (res.ok) setPricingInfo(await res.json());
    } catch { /* ignore */ }
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof newTerritory) => {
      const res = await apiRequest("POST", "/api/territories", {
        clientId: Number(data.clientId),
        industryId: Number(data.industryId),
        state: data.state,
        city: data.entireState ? "Statewide" : data.city,
        depositBalance: 0,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/territories"] });
      setAddOpen(false);
      setNewTerritory({ clientId: "", industryId: "", state: "", city: "", entireState: false });
      setPricingInfo(null);
      toast({ title: "Territory created", description: "Price set automatically based on city population." });
    },
  });

  const getClient = (clientId: number) => clients.find(c => c.id === clientId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold font-display text-foreground">Territories</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage territory deposits and monthly performance stats.</p>
      </div>
      <Button onClick={() => setAddOpen(true)} data-testid="button-add-territory">
        <Plus className="w-4 h-4 mr-1.5" /> Add Territory
      </Button>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Territory</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Client</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Population</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deposit</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Balance</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading…</td></tr>
            ) : territories.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">No territories yet.</td></tr>
            ) : territories.map(t => {
              const client = getClient(t.clientId);
              return (
                <tr key={t.id} className="border-b border-border last:border-0 hoverable">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="font-medium text-foreground">{t.city === "Statewide" ? `${t.state} — Entire State` : `${t.city}, ${t.state}`}</span>
                    </div>
                    <Badge variant={t.active ? "default" : "secondary"} className="text-xs mt-0.5">{t.active ? "Active" : "Paused"}</Badge>
                    {t.excludedCities && (() => { try { const cities = JSON.parse(t.excludedCities) as string[]; return cities.length > 0 ? <p className="text-xs text-amber-400 mt-0.5">Excluded: {cities.join(", ")}</p> : null; } catch { return null; } })()}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                    {client ? `${client.firstName} ${client.lastName}` : "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs tabular">
                    {t.population ? t.population.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs tabular">
                    ${t.depositAmount.toFixed(0)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold tabular text-sm ${t.depositBalance < 400 ? "text-red-400" : "text-green-400"}`}>
                      ${t.depositBalance.toFixed(2)}
                    </span>
                    {t.depositBalance < 400 && <span className="text-xs text-red-400 ml-1">⚠ Low</span>}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setDepositOpen(t); setDepositAmount(""); }} data-testid={`button-deposit-${t.id}`}>
                        <DollarSign className="w-3 h-3 mr-1" /> Deposit
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setStatsOpen(t); setStatsForm({ monthlyAdSpend: String(t.monthlyAdSpend), monthlyLeadsGenerated: String(t.monthlyLeadsGenerated), monthlyLeadRevenue: String(t.monthlyLeadRevenue) }); }} data-testid={`button-stats-${t.id}`}>
                        <BarChart2 className="w-3 h-3 mr-1" /> Stats
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs h-7 text-red-400 hover:text-red-300" onClick={() => setDeleteTarget(t)}>
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Deposit Dialog */}
      <Dialog open={!!depositOpen} onOpenChange={() => setDepositOpen(null)}>
        {depositOpen && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">Record Deposit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Territory: <span className="font-medium text-foreground">{depositOpen.city === "Statewide" ? `${depositOpen.state} — Entire State` : `${depositOpen.city}, ${depositOpen.state}`}</span><br />
                Current balance: <span className="font-bold text-primary tabular">${depositOpen.depositBalance.toFixed(2)}</span>
              </p>
              <div className="space-y-1.5">
                <Label>Deposit Amount ($)</Label>
                <Input
                  data-testid="input-deposit-amount"
                  type="number"
                  min="1"
                  placeholder="e.g. 2000"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <Button
                className="w-full"
                onClick={() => depositMutation.mutate({ id: depositOpen.id, amount: Number(depositAmount) })}
                disabled={!depositAmount || Number(depositAmount) <= 0 || depositMutation.isPending}
                data-testid="button-confirm-deposit"
              >
                {depositMutation.isPending ? "Recording…" : "Confirm Deposit"}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Add Territory Dialog */}
      <Dialog open={addOpen} onOpenChange={() => setAddOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Create Territory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select value={newTerritory.clientId} onValueChange={v => setNewTerritory(f => ({ ...f, clientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.firstName} {c.lastName} ({c.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Industry</Label>
              <Select value={newTerritory.industryId} onValueChange={v => setNewTerritory(f => ({ ...f, industryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  {industries.filter(i => i.active).map(i => (
                    <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Select value={newTerritory.state} onValueChange={v => { setNewTerritory(f => ({ ...f, state: v })); fetchPricing(v, newTerritory.city, newTerritory.entireState); }}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newTerritory.entireState}
                  onChange={e => { const checked = e.target.checked; setNewTerritory(f => ({ ...f, entireState: checked, city: checked ? "" : f.city })); fetchPricing(newTerritory.state, "", checked); }}
                  className="rounded border-border"
                />
                <span className="text-sm font-medium text-foreground">Entire State Territory</span>
              </label>
            </div>
            {!newTerritory.entireState && (
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input
                  placeholder="e.g. Austin"
                  value={newTerritory.city}
                  onChange={e => setNewTerritory(f => ({ ...f, city: e.target.value }))}
                  onBlur={() => fetchPricing(newTerritory.state, newTerritory.city, newTerritory.entireState)}
                />
              </div>
            )}
            {pricingInfo && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Territory Deposit</span>
                  <span className="text-xl font-bold text-primary tabular">${pricingInfo.price.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {pricingInfo.tier}
                  {pricingInfo.population ? ` — Population: ${pricingInfo.population.toLocaleString()}` : ""}
                </p>
              </div>
            )}
            <Button
              className="w-full"
              onClick={() => createMutation.mutate(newTerritory)}
              disabled={!newTerritory.clientId || !newTerritory.industryId || !newTerritory.state || (!newTerritory.entireState && !newTerritory.city.trim()) || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create Territory"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={!!statsOpen} onOpenChange={() => setStatsOpen(null)}>
        {statsOpen && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">Update Monthly Stats</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{statsOpen.city === "Statewide" ? `${statsOpen.state} — Entire State` : `${statsOpen.city}, ${statsOpen.state}`}</p>
              <div className="space-y-1">
                <Label className="text-xs">Monthly Ad Spend ($)</Label>
                <Input type="number" value={statsForm.monthlyAdSpend} onChange={e => setStatsForm(f => ({ ...f, monthlyAdSpend: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Leads Generated</Label>
                <Input type="number" value={statsForm.monthlyLeadsGenerated} onChange={e => setStatsForm(f => ({ ...f, monthlyLeadsGenerated: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Lead Revenue ($)</Label>
                <Input type="number" value={statsForm.monthlyLeadRevenue} onChange={e => setStatsForm(f => ({ ...f, monthlyLeadRevenue: e.target.value }))} />
              </div>
              {Number(statsForm.monthlyAdSpend) > 0 && Number(statsForm.monthlyLeadRevenue) > 0 && (
                <div className="p-3 rounded-lg bg-muted text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profit</span>
                    <span className={`font-bold ${Number(statsForm.monthlyLeadRevenue) - Number(statsForm.monthlyAdSpend) > 0 ? "text-green-400" : "text-red-400"}`}>
                      ${(Number(statsForm.monthlyLeadRevenue) - Number(statsForm.monthlyAdSpend)).toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">ROI</span>
                    <span className="font-bold text-foreground">
                      {((Number(statsForm.monthlyLeadRevenue) / Number(statsForm.monthlyAdSpend)) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
              <Button className="w-full" disabled={statsMutation.isPending} onClick={() => statsMutation.mutate({ id: statsOpen.id, data: statsForm })}>
                {statsMutation.isPending ? "Saving…" : "Save Stats"}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Territory Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget ? (deleteTarget.city === "Statewide" ? `${deleteTarget.state} — Entire State` : `${deleteTarget.city}, ${deleteTarget.state}`) : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this territory and all associated leads and deposit transactions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete Territory"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
