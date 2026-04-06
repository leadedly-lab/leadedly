import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, Clock, Phone, Mail, DollarSign, MapPin, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Lead } from "@shared/schema";

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "secondary" },
  { value: "contacted", label: "Contacted", color: "default" },
  { value: "no_answer", label: "No Answer", color: "secondary" },
  { value: "interested", label: "Interested", color: "default" },
  { value: "not_interested", label: "Not Interested", color: "secondary" },
  { value: "closed", label: "Closed", color: "default" },
];

const OOC_WINDOW = 60 * 60 * 1000;

function OOCTimer({ receivedAt, status }: { receivedAt: number; status: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (status !== "new") return;
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, [status]);

  if (status !== "new") return null;
  const elapsed = now - receivedAt;
  const remaining = OOC_WINDOW - elapsed;

  if (remaining <= 0) {
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-red-400 ooc-pulse">
        <AlertTriangle className="w-3 h-3" /> OOC
      </span>
    );
  }

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const pct = Math.max(0, (remaining / OOC_WINDOW) * 100);
  const urgent = remaining < 15 * 60 * 1000;

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${urgent ? "bg-red-500 ooc-pulse" : "bg-yellow-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-mono font-bold tabular ${urgent ? "text-red-400 ooc-pulse" : "text-yellow-400"}`}>
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
    </div>
  );
}

export default function LeadManager({ clientId }: { clientId: number }) {
  const { toast } = useToast();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [noteText, setNoteText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: [`/api/leads/client/${clientId}`],
    enabled: !!clientId,
    refetchInterval: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const res = await apiRequest("PATCH", `/api/leads/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/client/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/territories/client/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/stats/client/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/client/${clientId}`] });
      setSelectedLead(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function handleStatusChange(lead: Lead, status: string) {
    if (status === "closed") {
      updateMutation.mutate({ id: lead.id, updates: { status } });
      toast({ title: "Lead closed! 🎉", description: "Success fee has been deducted from your deposit." });
    } else {
      updateMutation.mutate({ id: lead.id, updates: { status } });
    }
  }

  function handleSaveNote() {
    if (!selectedLead) return;
    updateMutation.mutate({ id: selectedLead.id, updates: { notes: noteText } });
  }

  const filtered = statusFilter === "all" ? leads : leads.filter(l => l.status === statusFilter);
  const newLeads = leads.filter(l => l.status === "new").length;
  const oocLeads = leads.filter(l => l.status === "ooc").length;

  const statusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "closed") return "default";
    if (status === "ooc") return "destructive";
    if (status === "interested") return "default";
    return "secondary";
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Lead Manager</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {newLeads > 0 && <span className="text-yellow-400 font-medium">{newLeads} new — </span>}
            Contact new leads within 1 hour to avoid OOC fees.
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="All leads" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All leads</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            <SelectItem value="ooc">OOC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* OOC warning */}
      {oocLeads > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-semibold text-red-400">{oocLeads} OOC {oocLeads === 1 ? "lead" : "leads"}:</span> A $40 fee has been deducted from your deposit for each out-of-compliance lead.
          </p>
        </div>
      )}

      {/* Leads table */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No leads here yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">Once your territory is activated and funded, fresh leads will appear here daily.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Assets</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">City</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Timer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => (
                  <tr key={lead.id} className="border-b border-border hoverable cursor-pointer" onClick={() => { setSelectedLead(lead); setNoteText(lead.notes); }}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{lead.firstName} {lead.lastName}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-muted-foreground text-xs">{lead.email}</p>
                      <p className="text-muted-foreground text-xs">{lead.phone}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{lead.investableAssets || "—"}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">{lead.city}</td>
                    <td className="px-4 py-3">
                      <OOCTimer receivedAt={lead.receivedAt} status={lead.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(lead.status)} className="text-xs capitalize">
                        {lead.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5 flex-wrap">
                        {lead.status !== "closed" && lead.status !== "ooc" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            data-testid={`button-close-${lead.id}`}
                            onClick={() => handleStatusChange(lead, "closed")}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Close
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lead detail dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        {selectedLead && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">{selectedLead.firstName} {selectedLead.lastName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />{selectedLead.email}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />{selectedLead.phone}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />{selectedLead.city}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-3.5 h-3.5" />{selectedLead.investableAssets || "Not specified"}
                </div>
              </div>

              {/* OOC timer */}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <OOCTimer receivedAt={selectedLead.receivedAt} status={selectedLead.status} />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Update Status</label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(opt => (
                    <Button
                      key={opt.value}
                      size="sm"
                      variant={selectedLead.status === opt.value ? "default" : "outline"}
                      className="text-xs"
                      data-testid={`button-status-${opt.value}`}
                      onClick={() => handleStatusChange(selectedLead, opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</label>
                <Textarea
                  data-testid="textarea-notes"
                  placeholder="Add your notes about this lead…"
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  className="resize-none text-sm"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveNote} disabled={updateMutation.isPending} data-testid="button-save-notes">
                  Save Notes
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedLead(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
