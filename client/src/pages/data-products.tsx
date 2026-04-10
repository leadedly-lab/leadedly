import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Database, ShoppingCart, RefreshCw, FileText } from "lucide-react";
import type { DataProduct, DataSubscription } from "@shared/schema";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

type EnrichedSub = DataSubscription & { productName: string };

export default function DataProducts({ clientId }: { clientId?: number }) {
  const { toast } = useToast();

  const { data: products = [], isLoading: loadingProducts } = useQuery<DataProduct[]>({
    queryKey: ["/api/data-products"],
    enabled: !!clientId,
  });

  const { data: subscriptions = [], isLoading: loadingSubs } = useQuery<EnrichedSub[]>({
    queryKey: ["/api/data-subscriptions", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/data-subscriptions?clientId=${clientId}`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    enabled: !!clientId,
  });

  const purchaseMutation = useMutation({
    mutationFn: async ({ productId, type }: { productId: number; type: "one_time" | "monthly" }) => {
      const res = await apiRequest("POST", "/api/data-subscriptions", { productId, type, clientId });
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-subscriptions"] });
      toast({
        title: vars.type === "one_time" ? "Purchase complete" : "Subscription started",
        description:
          vars.type === "one_time"
            ? "Your one-time data feed has been purchased."
            : "Your monthly data feed subscription is now active.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const formatDate = (ts: number | null) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold font-display text-foreground">Data Products</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Browse and purchase data feeds for your business.
        </p>
      </div>

      {/* Products Grid */}
      {loadingProducts ? (
        <p className="text-sm text-muted-foreground">Loading products…</p>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Database className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">No data products available right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Database className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base font-semibold">{p.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {p.recordCount.toLocaleString()} records
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between gap-4">
                {p.description && (
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                )}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-xs text-muted-foreground">One-Time Purchase</p>
                      <p className="text-lg font-bold tabular">{fmt(p.oneTimePrice)}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => purchaseMutation.mutate({ productId: p.id, type: "one_time" })}
                      disabled={purchaseMutation.isPending}
                    >
                      <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                      Buy
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-xs text-muted-foreground">Monthly Subscription</p>
                      <p className="text-lg font-bold tabular">
                        {fmt(p.monthlyPrice)}
                        <span className="text-xs font-normal text-muted-foreground">/mo</span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => purchaseMutation.mutate({ productId: p.id, type: "monthly" })}
                      disabled={purchaseMutation.isPending}
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Subscribe
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Subscriptions */}
      <div>
        <h2 className="text-lg font-bold font-display text-foreground mb-3">My Subscriptions</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Purchased</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Next Billing</th>
              </tr>
            </thead>
            <tbody>
              {loadingSubs ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading…</td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No subscriptions yet. Purchase a data product above to get started.
                  </td>
                </tr>
              ) : (
                subscriptions.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hoverable">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="font-medium text-foreground">{s.productName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={s.type === "monthly" ? "default" : "secondary"}>
                        {s.type === "one_time" ? "One-Time" : "Monthly"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium tabular">{fmt(s.amount)}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant={s.status === "active" ? "default" : "secondary"}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs tabular">
                      {formatDate(s.createdAt)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs tabular">
                      {s.type === "monthly" ? formatDate(s.nextBillingAt) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
