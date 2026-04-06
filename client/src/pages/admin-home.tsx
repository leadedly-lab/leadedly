import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, DollarSign, TrendingUp, CheckCircle, AlertTriangle } from "lucide-react";

function KPI({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "text-primary bg-primary/10",
    green: "text-green-400 bg-green-500/10",
    gold: "text-yellow-400 bg-yellow-500/10",
    red: "text-red-400 bg-red-500/10",
  };
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-foreground tabular">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminHome() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/stats/admin"] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });
  const { data: leads = [] } = useQuery<any[]>({ queryKey: ["/api/leads"] });

  const recentClients = clients.slice(-5).reverse();
  const recentLeads = leads.slice(0, 6);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold font-display text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Platform-wide performance overview.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPI label="Total Clients" value={stats?.totalClients ?? 0} icon={Users} color="blue" />
        <KPI label="Territories" value={stats?.totalTerritories ?? 0} icon={MapPin} color="gold" />
        <KPI label="Total Leads" value={stats?.totalLeads ?? 0} icon={TrendingUp} color="green" />
        <KPI label="Closed Deals" value={stats?.closedLeads ?? 0} icon={CheckCircle} color="green" />
        <KPI label="Fee Revenue" value={`$${(stats?.totalRevenue ?? 0).toFixed(2)}`} icon={DollarSign} color="gold" />
        <KPI label="Total Deposited" value={`$${(stats?.totalDeposits ?? 0).toFixed(2)}`} icon={DollarSign} color="blue" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Recent Clients</CardTitle>
          </CardHeader>
          <CardContent>
            {recentClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No clients yet.</p>
            ) : recentClients.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.firstName} {c.lastName}</p>
                  <p className="text-xs text-muted-foreground">{c.companyName}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === "active" ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Recent Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No leads yet.</p>
            ) : recentLeads.map((l: any) => (
              <div key={l.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{l.firstName} {l.lastName}</p>
                  <p className="text-xs text-muted-foreground">{l.city}</p>
                </div>
                <span className={`text-xs capitalize px-2 py-0.5 rounded-full ${
                  l.status === "closed" ? "bg-green-500/15 text-green-400" :
                  l.status === "ooc" ? "bg-red-500/15 text-red-400" :
                  "bg-muted text-muted-foreground"
                }`}>{l.status.replace("_"," ")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
