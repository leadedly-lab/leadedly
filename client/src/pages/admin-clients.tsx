import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, Edit2, Search, Plus, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import type { Client, Industry, Territory } from "@shared/schema";

export default function AdminClients() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState<Client | null>(null);
  const [importTerritoryId, setImportTerritoryId] = useState("");
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; total: number; errors: string[] } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const { data: clients = [], isLoading } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: industries = [] } = useQuery<Industry[]>({ queryKey: ["/api/industries"] });
  const { data: territories = [] } = useQuery<Territory[]>({ queryKey: ["/api/territories"] });

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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/territories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setDeleteTarget(null);
      toast({ title: "Client deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async ({ clientId, territoryId }: { clientId: number; territoryId: number }) => {
      const res = await apiRequest("POST", `/api/leads/import/${clientId}`, { territoryId });
      return res.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
    onError: (e: any) => {
      toast({ title: "Import failed", description: e?.message || "Unknown error", variant: "destructive" });
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
                    {c.googleSheetUrl && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setImportOpen(c); setImportTerritoryId(""); setImportResult(null); }} data-testid={`button-import-leads-${c.id}`}>
                        <FileSpreadsheet className="w-3 h-3 mr-1" /> Import
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-xs h-7 text-red-400 hover:text-red-300" onClick={() => setDeleteTarget(c)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
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
              <div className="space-y-1">
                <Label className="text-xs">Google Sheet URL</Label>
                <Input
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={editClient.googleSheetUrl || ""}
                  onChange={e => setEditClient(c => c && ({ ...c, googleSheetUrl: e.target.value || null }))}
                />
                <p className="text-xs text-muted-foreground">Paste the Google Sheets link for this client's Facebook lead forms. The sheet must be shared as "Anyone with the link".</p>
              </div>
              <Button className="w-full" onClick={() => updateMutation.mutate({ id: editClient.id, data: editClient })} disabled={updateMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Import Leads Dialog */}
      <Dialog open={!!importOpen} onOpenChange={() => setImportOpen(null)}>
        {importOpen && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-500" />
                Import Leads from Google Sheets
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">Client: <span className="font-medium text-foreground">{importOpen.firstName} {importOpen.lastName}</span></p>
                <p className="text-xs text-muted-foreground mt-1 truncate">Sheet: <a href={importOpen.googleSheetUrl || ""} target="_blank" rel="noopener" className="text-primary hover:underline">{importOpen.googleSheetUrl}</a></p>
              </div>

              {!importResult ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Assign to Territory</Label>
                    <Select value={importTerritoryId} onValueChange={setImportTerritoryId}>
                      <SelectTrigger><SelectValue placeholder="Select territory…" /></SelectTrigger>
                      <SelectContent>
                        {territories.filter(t => t.clientId === importOpen.id).map(t => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.city === "Statewide" ? `${t.state} — Entire State` : `${t.city}, ${t.state}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">All imported leads will be assigned to this territory.</p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => importMutation.mutate({ clientId: importOpen.id, territoryId: Number(importTerritoryId) })}
                    disabled={!importTerritoryId || importMutation.isPending}
                  >
                    {importMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing…</>
                    ) : "Import Leads"}
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="font-semibold text-foreground">Import Complete</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center mt-3">
                      <div>
                        <p className="text-2xl font-bold text-green-400">{importResult.imported}</p>
                        <p className="text-xs text-muted-foreground">Imported</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-yellow-400">{importResult.skipped}</p>
                        <p className="text-xs text-muted-foreground">Skipped</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-muted-foreground">{importResult.total}</p>
                        <p className="text-xs text-muted-foreground">Total Rows</p>
                      </div>
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-medium text-red-400">Errors</span>
                      </div>
                      {importResult.errors.map((e, i) => (
                        <p key={i} className="text-xs text-muted-foreground">{e}</p>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" className="w-full" onClick={() => setImportOpen(null)}>Done</Button>
                </div>
              )}
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
                    <SelectItem key={t.id} value={String(t.id)}>{t.city === "Statewide" ? `${t.state} — Entire State` : `${t.city}, ${t.state}`}</SelectItem>
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
      {/* Delete Client Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.firstName} {deleteTarget?.lastName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this client and ALL their associated data including territories, leads, deposits, bank connections, and subscriptions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete Client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
