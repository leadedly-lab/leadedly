import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import type { DepositTransaction, Client, Territory } from "@shared/schema";

type StripeDeposit = {
  id: number;
  clientId: number;
  territoryId: number;
  paymentIntentId: string;
  amount: number;
  status: string;
  description: string;
  isAutoReplenish: boolean;
  createdAt: number;
  settledAt: number | null;
};

export default function AdminDeposits() {
  const { data: transactions = [], isLoading } = useQuery<DepositTransaction[]>({ queryKey: ["/api/transactions"] });
  const { data: stripeDeposits = [] } = useQuery<StripeDeposit[]>({ queryKey: ["/api/admin/stripe-deposits"], refetchInterval: 30000 });
  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: territories = [] } = useQuery<Territory[]>({ queryKey: ["/api/territories"] });

  const totalDeposited   = transactions.filter(t => t.type === "deposit").reduce((s, t) => s + t.amount, 0);
  const totalFees        = transactions.filter(t => t.type !== "deposit").reduce((s, t) => s + Math.abs(t.amount), 0);
  const successFees      = transactions.filter(t => t.type === "success_fee").reduce((s, t) => s + Math.abs(t.amount), 0);
  const oocFees          = transactions.filter(t => t.type === "ooc_fee").reduce((s, t) => s + Math.abs(t.amount), 0);
  const pendingDeposits  = stripeDeposits.filter(d => d.status === "pending" || d.status === "processing");
  const pendingTotal     = pendingDeposits.reduce((s, d) => s + d.amount, 0);

  const getClient    = (id: number) => clients.find(c => c.id === id);
  const getTerritory = (id: number) => territories.find(t => t.id === id);

  function statusBadge(status: string) {
    if (status === "settled" || status === "succeeded")
      return <Badge variant="default" className="text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Settled</Badge>;
    if (status === "processing")
      return <Badge variant="secondary" className="text-xs flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Processing</Badge>;
    if (status === "pending")
      return <Badge variant="secondary" className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
    if (status === "failed" || status === "canceled")
      return <Badge variant="destructive" className="text-xs flex items-center gap-1"><XCircle className="w-3 h-3" /> Failed</Badge>;
    return <Badge variant="secondary" className="text-xs">{status}</Badge>;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold font-display text-foreground">Deposits & Transactions</h1>
        <p className="text-muted-foreground text-sm mt-0.5">All financial activity across the platform.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Deposited",   value: `$${totalDeposited.toFixed(0)}`,  color: "text-green-400" },
          { label: "Pending / In Transit", value: `$${pendingTotal.toFixed(0)}`, color: "text-yellow-400" },
          { label: "Total Fees Earned", value: `$${totalFees.toFixed(0)}`,       color: "text-primary" },
          { label: "Success Fees",      value: `$${successFees.toFixed(0)}`,     color: "text-blue-400" },
          { label: "OOC Fees",          value: `$${oocFees.toFixed(0)}`,         color: "text-red-400" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-2xl font-bold tabular ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Stripe deposits — ACH in transit */}
      {pendingDeposits.length > 0 && (
        <Card className="border-yellow-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              Pending ACH Deposits
              <Badge variant="secondary" className="text-xs ml-1">{pendingDeposits.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              These deposits have been initiated via Stripe but are still in transit. ACH typically takes 1–3 business days to settle. The client's balance will be credited automatically once Stripe confirms settlement.
            </p>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Territory</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Payment ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDeposits.map(d => {
                    const client    = getClient(d.clientId);
                    const territory = getTerritory(d.territoryId);
                    return (
                      <tr key={d.id} className="border-b border-border last:border-0 hoverable">
                        <td className="px-4 py-3">{statusBadge(d.status)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {client ? `${client.firstName} ${client.lastName}` : "—"}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                          {territory ? `${territory.city}, ${territory.state}` : "—"}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <a
                            href={`https://dashboard.stripe.com/payments/${d.paymentIntentId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline font-mono"
                          >
                            {d.paymentIntentId.slice(0, 20)}…
                          </a>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                          {new Date(d.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular text-yellow-400">
                          +${d.amount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settled transactions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> All Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Territory</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center">
                      <div className="text-muted-foreground text-sm">No settled transactions yet.</div>
                      {pendingDeposits.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {pendingDeposits.length} deposit{pendingDeposits.length > 1 ? "s are" : " is"} pending settlement above.
                        </div>
                      )}
                    </td>
                  </tr>
                ) : transactions.map(tx => {
                  const client    = getClient(tx.clientId);
                  const territory = getTerritory(tx.territoryId);
                  return (
                    <tr key={tx.id} className="border-b border-border last:border-0 hoverable">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {tx.type === "deposit"      ? <ArrowUpCircle className="w-4 h-4 text-green-400" /> :
                           tx.type === "ooc_fee"      ? <AlertTriangle className="w-4 h-4 text-red-400" /> :
                           <ArrowDownCircle className="w-4 h-4 text-yellow-400" />}
                          <Badge
                            variant={tx.type === "deposit" ? "default" : tx.type === "ooc_fee" ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {tx.type === "ooc_fee" ? "OOC Fee" : tx.type === "success_fee" ? "Success Fee" : "Deposit"}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">
                        {client ? `${client.firstName} ${client.lastName}` : "—"}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                        {territory ? (territory.city === "Statewide" ? `${territory.state} — Entire State` : `${territory.city}, ${territory.state}`) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">{tx.description}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold tabular ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                        {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
