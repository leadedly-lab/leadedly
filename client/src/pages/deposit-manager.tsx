import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingDown, AlertTriangle, DollarSign, ArrowDownCircle, ArrowUpCircle, Landmark, Zap } from "lucide-react";
import { useLocation } from "wouter";
import type { Territory, DepositTransaction } from "@shared/schema";

type PlaidStatus = { configured: boolean; linked: boolean; item: any | null };

function TransactionIcon({ type }: { type: string }) {
  if (type === "deposit") return <ArrowUpCircle className="w-4 h-4 text-green-400 flex-shrink-0" />;
  if (type === "ooc_fee") return <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />;
  return <ArrowDownCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />;
}

export default function DepositManager({ clientId }: { clientId: number }) {
  const [, navigate] = useLocation();
  const { data: territories = [] } = useQuery<Territory[]>({
    queryKey: [`/api/territories/client/${clientId}`],
    enabled: !!clientId,
  });
  const { data: transactions = [] } = useQuery<DepositTransaction[]>({
    queryKey: [`/api/transactions/client/${clientId}`],
    enabled: !!clientId,
  });
  const { data: plaidStatus } = useQuery<PlaidStatus>({
    queryKey: [`/api/plaid/status/${clientId}`],
    enabled: !!clientId,
  });

  const totalBalance = territories.reduce((s, t) => s + t.depositBalance, 0);
  const totalDeposited = transactions.filter(t => t.type === "deposit").reduce((s, t) => s + t.amount, 0);
  const totalFees = transactions.filter(t => t.type !== "deposit").reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold font-display text-foreground">Deposit Manager</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Track your deposit balances and transaction history across all territories.</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="stat-card-blue">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Balance</p>
            <p className="text-2xl font-bold text-primary tabular">${totalBalance.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="stat-card-green">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Deposited</p>
            <p className="text-2xl font-bold text-green-400 tabular">${totalDeposited.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="stat-card-red">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Fees Paid</p>
            <p className="text-2xl font-bold text-red-400 tabular">${totalFees.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Territory balances */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" /> Territory Deposit Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          {territories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No territories yet. Add a territory to get started.</p>
          ) : (
            <div className="space-y-3">
              {territories.map(t => (
                <div key={t.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-foreground">{t.city}, {t.state}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Initial deposit: ${t.depositAmount.toFixed(0)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold tabular ${t.depositBalance < 400 ? "text-red-400" : "text-green-400"}`}>
                      ${t.depositBalance.toFixed(2)}
                    </p>
                    {t.depositBalance < 400 && (
                      <div className="flex items-center gap-1 text-xs text-red-400 mt-0.5">
                        <AlertTriangle className="w-3 h-3" /> Low balance
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No transactions yet.</p>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b border-border last:border-0 hoverable">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TransactionIcon type={tx.type} />
                          <Badge
                            variant={tx.type === "deposit" ? "default" : tx.type === "ooc_fee" ? "destructive" : "secondary"}
                            className="text-xs capitalize"
                          >
                            {tx.type === "ooc_fee" ? "OOC Fee" : tx.type === "success_fee" ? "Success Fee" : "Deposit"}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{tx.description}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold tabular ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                        {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ACH / Bank prompt */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Landmark className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-foreground text-sm">Fund via ACH Bank Transfer</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {plaidStatus?.linked
                ? `Linked: ${plaidStatus.item?.institutionName} ••••${plaidStatus.item?.accountMask} · Auto-replenish ${plaidStatus.item?.autoReplenishEnabled ? "ON" : "OFF"}`
                : "Link your checking account to deposit funds directly via ACH. No credit cards accepted."}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant={plaidStatus?.linked ? "outline" : "default"}
          onClick={() => navigate("/bank")}
          className="flex-shrink-0"
        >
          {plaidStatus?.linked ? (
            <><Zap className="w-4 h-4 mr-1.5" /> Deposit / Settings</>
          ) : (
            <><Landmark className="w-4 h-4 mr-1.5" /> Link Bank Account</>
          )}
        </Button>
      </div>
    </div>
  );
}
