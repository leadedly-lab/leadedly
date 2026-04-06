import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, Edit2, Search, Plus } from "lucide-react";
import type { Client, Industry } from "@shared/schema";

export default function AdminClients() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const { data: clients = [], isLoading } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: industries = [] } = useQuery<Industry[]>({ queryKey: ["/api/industries"] });
  const { data: territories = [] } = useQuery<any[]>({ queryKey: ["/api/territories"] });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/clients/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setEditClient(null);
      toast({ title: "Client updated" });
    },
  });

  const addLeadMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/leads", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setAddLeadOpen(false);
      toast({ title: "Lead added successfully" });
    },
  });

  const [leadForm, setLeadForm] = useState({ firstName: "", lastName: "", email: "", phone: "", city: "", investableAssets: "", territoryId: "" });

  const filtered = clients.filter(c =>
    `${c.firstName} ${c.lastName} ${c.companyName} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const getIndustryName = (id: number) => industries.find(i => i.id === id)?.name ?? "—";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Clients</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{clients.length} registered clients</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="input-search-clients"
            placeholder="Search clients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 w-56"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Industry</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No clients found.</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="border-b border-border last:border-0 hoverable">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{c.firstName} {c.lastName}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{c.companyName}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{getIndustryName(c.industryId)}</td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-xs capitalize">{c.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setEditClient(c)} data-testid={`button-edit-client-${c.id}`}>
                      <Edit2 className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setSelectedClientId(c.id); setAddLeadOpen(true); }} data-testid={`button-add-lead-${c.id}`}>
                      <Plus className="w-3 h-3 mr-1" /> Add Lead
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Client Dialog */}
      <Dialog open={!!editClient} onOpenChange={() => setEditClient(null)}>
        {editClient && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Edit Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">First Name</Label>
                  <Input value={editClient.firstName} onChange={e => setEditClient(c => c && ({ ...c, firstName: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Last Name</Label>
                  <Input value={editClient.lastName} onChange={e => setEditClient(c => c && ({ ...c, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Company Name</Label>
                <Input value={editClient.companyName} onChange={e => setEditClient(c => c && ({ ...c, companyName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Job Title</Label>
                <Input value={editClient.jobTitle} onChange={e => setEditClient(c => c && ({ ...c, jobTitle: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={editClient.status} onValueChange={v => setEditClient(c => c && ({ ...c, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Industry</Label>
                <Select value={String(editClient.industryId)} onValueChange={v => setEditClient(c => c && ({ ...c, industryId: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {industries.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => updateMutation.mutate({ id: editClient.id, data: editClient })} disabled={updateMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Add Lead Dialog */}
      <Dialog open={addLeadOpen} onOpenChange={setAddLeadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Add Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">First Name</Label>
                <Input value={leadForm.firstName} onChange={e => setLeadForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Last Name</Label>
                <Input value={leadForm.lastName} onChange={e => setLeadForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={leadForm.email} onChange={e => setLeadForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input value={leadForm.phone} onChange={e => setLeadForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">City</Label>
                <Input value={leadForm.city} onChange={e => setLeadForm(f => ({ ...f, city: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Investable Assets</Label>
              <Input placeholder="e.g. $500,000+" value={leadForm.investableAssets} onChange={e => setLeadForm(f => ({ ...f, investableAssets: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Assign to Territory</Label>
              <Select value={leadForm.territoryId} onValueChange={v => setLeadForm(f => ({ ...f, territoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select territory…" /></SelectTrigger>
                <SelectContent>
                  {territories.filter((t: any) => !selectedClientId || t.clientId === selectedClientId).map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.city}, {t.state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={addLeadMutation.isPending} onClick={() => {
              if (!selectedClientId || !leadForm.territoryId) return;
              addLeadMutation.mutate({ ...leadForm, clientId: selectedClientId, territoryId: Number(leadForm.territoryId) });
            }}>
              {addLeadMutation.isPending ? "Adding…" : "Add Lead"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
