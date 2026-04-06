import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Landmark, CheckCircle2, XCircle, RefreshCw, Zap, DollarSign } from "lucide-react";

type PlaidOverviewRow = {
  clientId: number;
  clientName: string;
  companyName: string;
  linked: boolean;
  institutionName: string;
  accountMask: string;
  autoReplenishEnabled: boolean;
  replenishAmount: number;
  totalAchDeposited: number;
  pendingTransfers: number;
};

export default function AdminPlaid() {
  const { toast } = useToast();

  const { data: overview = [], isLoading } = useQuery<PlaidOverviewRow[]>({
    queryKey: ["/api/admin/plaid-overview"],
    refetchInterval: 30000,
  });

  const replenishMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const res = await apiRequest("POST", `/api/admin/plaid-replenish/${clientId}`, {});
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, clientId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plaid-overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/admin"] });
      toast({
        title: "Replenish triggered",
        description: `${data.triggered} territory${data.triggered !== 1 ? "ies" : "y"} replenished for client #${clientId}.`,
      });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const linked = overview.filter(r => r.linked);
  const unlinked = overview.filter(r => !r.linked);
  const totalAch = overview.reduce((sum, r) => sum + r.totalAchDeposited, 0);
  const autoReplenishCount = overview.filter(r => r.linked && r.autoReplenishEnabled).length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold font-display text-foreground">ACH / Plaid Overview</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Monitor client bank account links, auto-replenish settings, and ACH deposit history.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="stat-card-blue">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Linked Accounts</p>
            <p className="text-2xl font-bold text-primary tabular">{linked.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">of {overview.length} clients</p>
          </CardContent>
        </Card>
        <Card className="stat-card-green">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total ACH Deposited</p>
            <p className="text-2xl font-bold text-green-400 tabular">${totalAch.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Auto-Replenish ON</p>
            <p className="text-2xl font-bold text-foreground tabular">{autoReplenishCount}</p>
          </CardContent>
        </Card>
        <Card className="stat-card-red">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Unlinked Clients</p>
            <p className="text-2xl font-bold text-red-400 tabular">{unlinked.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Client table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Landmark className="w-4 h-4 text-primary" /> Client Bank Account Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-10 rounded" />)}
            </div>
          ) : overview.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No clients yet.</p>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bank</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Auto-Replenish</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Total ACH</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.map(row => (
                    <tr key={row.clientId} className="border-b border-border last:border-0 hoverable">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground text-xs">{row.clientName}</p>
                        <p className="text-xs text-muted-foreground">{row.companyName}</p>
                      </td>
                      <td className="px-4 py-3">
                        {row.linked ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="text-xs flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Linked
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {row.institutionName} ••••{row.accountMask}
                            </span>
                            {row.pendingTransfers > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {row.pendingTransfers} pending
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Not linked
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {row.linked ? (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={row.autoReplenishEnabled ? "default" : "secondary"}
                              className="text-xs flex items-center gap-1"
                            >
                              <Zap className="w-3 h-3" />
                              {row.autoReplenishEnabled ? "ON" : "OFF"}
                            </Badge>
                            {row.autoReplenishEnabled && (
                              <span className="text-xs text-muted-foreground">${row.replenishAmount.toLocaleString()}/trigger</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className="text-xs font-bold text-green-400 tabular">
                          ${row.totalAchDeposited.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.linked && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => replenishMutation.mutate(row.clientId)}
                            disabled={replenishMutation.isPending}
                            data-testid={`button-admin-replenish-${row.clientId}`}
                          >
                            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${replenishMutation.isPending ? "animate-spin" : ""}`} />
                            Replenish
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
