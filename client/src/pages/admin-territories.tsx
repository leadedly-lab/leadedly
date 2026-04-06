import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MapPin, DollarSign, BarChart2, Edit2 } from "lucide-react";
import type { Territory, Client } from "@shared/schema";

export default function AdminTerritories() {
  const { toast } = useToast();
  const [depositOpen, setDepositOpen] = useState<Territory | null>(null);
  const [statsOpen, setStatsOpen] = useState<Territory | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [statsForm, setStatsForm] = useState({ monthlyAdSpend: "", monthlyLeadsGenerated: "", monthlyLeadRevenue: "" });

  const { data: territories = [], isLoading } = useQuery<Territory[]>({ queryKey: ["/api/territories"] });
  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });

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

  const getClient = (clientId: number) => clients.find(c => c.id === clientId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold font-display text-foreground">Territories</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage territory deposits and monthly performance stats.</p>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Territory</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Client</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Balance</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Ad Spend</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Revenue</th>
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
                      <span className="font-medium text-foreground">{t.city}, {t.state}</span>
                    </div>
                    <Badge variant={t.active ? "default" : "secondary"} className="text-xs mt-0.5">{t.active ? "Active" : "Paused"}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                    {client ? `${client.firstName} ${client.lastName}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold tabular text-sm ${t.depositBalance < 400 ? "text-red-400" : "text-green-400"}`}>
                      ${t.depositBalance.toFixed(2)}
                    </span>
                    {t.depositBalance < 400 && <span className="text-xs text-red-400 ml-1">⚠ Low</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs tabular">${t.monthlyAdSpend.toFixed(0)}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs tabular">${t.monthlyLeadRevenue.toFixed(0)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setDepositOpen(t); setDepositAmount(""); }} data-testid={`button-deposit-${t.id}`}>
                        <DollarSign className="w-3 h-3 mr-1" /> Deposit
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setStatsOpen(t); setStatsForm({ monthlyAdSpend: String(t.monthlyAdSpend), monthlyLeadsGenerated: String(t.monthlyLeadsGenerated), monthlyLeadRevenue: String(t.monthlyLeadRevenue) }); }} data-testid={`button-stats-${t.id}`}>
                        <BarChart2 className="w-3 h-3 mr-1" /> Stats
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
                Territory: <span className="font-medium text-foreground">{depositOpen.city}, {depositOpen.state}</span><br />
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

      {/* Stats Dialog */}
      <Dialog open={!!statsOpen} onOpenChange={() => setStatsOpen(null)}>
        {statsOpen && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">Update Monthly Stats</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{statsOpen.city}, {statsOpen.state}</p>
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
    </div>
  );
}
