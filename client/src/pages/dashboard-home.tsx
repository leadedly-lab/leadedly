import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { MapPin, Users, DollarSign, AlertTriangle, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";
import type { Lead, Territory } from "@shared/schema";

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: any; color: string; sub?: string;
}) {
  return (
    <Card className={`stat-card-${color}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-bold text-foreground tabular">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${color === "blue" ? "primary" : color === "green" ? "[hsl(142_76%_36%)]" : color === "gold" ? "[hsl(38_92%_50%)]" : "[hsl(0_72%_51%)]"}/15`}>
            <Icon className={`w-5 h-5 ${color === "blue" ? "text-primary" : color === "green" ? "text-green-500" : color === "gold" ? "text-yellow-500" : "text-red-500"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardHome({ clientId }: { clientId: number }) {
  const { auth } = useAuth();
  const { data: stats } = useQuery<any>({ queryKey: [`/api/stats/client/${clientId}`], enabled: !!clientId });
  const { data: leads = [] } = useQuery<Lead[]>({ queryKey: [`/api/leads/client/${clientId}`], enabled: !!clientId });
  const { data: territories = [] } = useQuery<Territory[]>({ queryKey: [`/api/territories/client/${clientId}`], enabled: !!clientId });

  const recentLeads = leads.slice(0, 5);
  const now = Date.now();
  const OOC_WINDOW = 60 * 60 * 1000;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold font-display text-foreground">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {auth?.user?.firstName}
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Here's your platform overview for today.</p>
      </div>

      {/* Low balance alert */}
      {stats?.lowBalance && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-foreground">
            <span className="font-semibold text-red-400">Low Balance Alert:</span> One or more of your territories has dropped below $400. Please wire additional funds to continue receiving leads.
          </p>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Territories" value={stats?.territoriesCount ?? 0} icon={MapPin} color="blue" sub="Active territories" />
        <StatCard label="Total Leads" value={stats?.totalLeads ?? 0} icon={Users} color="gold" sub="All time" />
        <StatCard label="Closed Deals" value={stats?.closedLeads ?? 0} icon={CheckCircle} color="green" sub="Revenue generated" />
        <StatCard label="OOC Incidents" value={stats?.oocLeads ?? 0} icon={XCircle} color="red" sub="Out of compliance" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Territory balances */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Territory Balances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {territories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No territories yet. Go to Territory Manager to add one.</p>
            ) : territories.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.city === "Statewide" ? `${t.state} — Entire State` : `${t.city}, ${t.state}`}</p>
                  <p className="text-xs text-muted-foreground">Deposit: ${t.depositAmount.toFixed(0)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold tabular ${t.depositBalance < 400 ? "text-red-400" : "text-green-400"}`}>
                    ${t.depositBalance.toFixed(2)}
                  </p>
                  {t.depositBalance < 400 && <Badge variant="destructive" className="text-xs">Low</Badge>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent leads */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Recent Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Leads will appear here once your territory is active.</p>
            ) : recentLeads.map(lead => {
              const isNew = lead.status === "new";
              const ageMs = now - lead.receivedAt;
              const minsLeft = Math.max(0, Math.ceil((OOC_WINDOW - ageMs) / 60000));
              const isUrgent = isNew && ageMs < OOC_WINDOW;
              return (
                <div key={lead.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{lead.firstName} {lead.lastName}</p>
                    <p className="text-xs text-muted-foreground">{lead.city}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isUrgent && (
                      <span className="flex items-center gap-1 text-xs font-medium text-yellow-400 ooc-pulse">
                        <Clock className="w-3 h-3" /> {minsLeft}m left
                      </span>
                    )}
                    <Badge variant={lead.status === "closed" ? "default" : lead.status === "ooc" ? "destructive" : "secondary"} className="text-xs capitalize">
                      {lead.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
