import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Database } from "lucide-react";
import type { DataProduct } from "@shared/schema";

const emptyForm = {
  name: "",
  description: "",
  recordCount: "",
  oneTimePrice: "",
  monthlyPrice: "",
  active: true,
};

export default function AdminDataProducts() {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DataProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DataProduct | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: products = [], isLoading } = useQuery<DataProduct[]>({
    queryKey: ["/api/admin/data-products"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const body = {
        name: data.name,
        description: data.description,
        recordCount: Number(data.recordCount),
        oneTimePrice: Number(data.oneTimePrice),
        monthlyPrice: Number(data.monthlyPrice),
        active: data.active,
      };
      if (editing) {
        const res = await apiRequest("PUT", `/api/admin/data-products/${editing.id}`, body);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/admin/data-products", body);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/data-products"] });
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      toast({ title: editing ? "Product updated" : "Product created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/data-products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/data-products"] });
      setDeleteTarget(null);
      toast({ title: "Product deleted" });
    },
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (p: DataProduct) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description,
      recordCount: String(p.recordCount),
      oneTimePrice: String(p.oneTimePrice),
      monthlyPrice: String(p.monthlyPrice),
      active: p.active,
    });
    setFormOpen(true);
  };

  const canSave =
    form.name.trim() &&
    form.recordCount &&
    Number(form.recordCount) > 0 &&
    form.oneTimePrice &&
    Number(form.oneTimePrice) >= 0 &&
    form.monthlyPrice &&
    Number(form.monthlyPrice) >= 0;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold font-display text-foreground">Data Products</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Create and manage data feed products that clients can purchase.
        </p>
      </div>

      <Button onClick={openAdd}>
        <Plus className="w-4 h-4 mr-1.5" /> Add Product
      </Button>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Records</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">One-Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Monthly</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  Loading…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  No data products yet. Click "Add Product" to create one.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hoverable">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <div>
                        <span className="font-medium text-foreground">{p.name}</span>
                        {p.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground tabular">
                    {p.recordCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium tabular">{fmt(p.oneTimePrice)}</td>
                  <td className="px-4 py-3 font-medium tabular">{fmt(p.monthlyPrice)}<span className="text-muted-foreground text-xs">/mo</span></td>
                  <td className="px-4 py-3">
                    <Badge variant={p.active ? "default" : "secondary"}>
                      {p.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => openEdit(p)}>
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs h-7 text-red-400 hover:text-red-300" onClick={() => setDeleteTarget(p)}>
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={() => { setFormOpen(false); setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Edit Product" : "Add Data Product"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the data feed product details." : "Create a new data feed product for clients to purchase."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Product Name</Label>
              <Input
                placeholder="e.g. Premium Leads – 10K"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what's included in this data feed…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Number of Records</Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 10000"
                value={form.recordCount}
                onChange={(e) => setForm((f) => ({ ...f, recordCount: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>One-Time Price ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 499.00"
                  value={form.oneTimePrice}
                  onChange={(e) => setForm((f) => ({ ...f, oneTimePrice: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly Price ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 99.00"
                  value={form.monthlyPrice}
                  onChange={(e) => setForm((f) => ({ ...f, monthlyPrice: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
              <Label className="cursor-pointer">Active (visible to clients)</Label>
            </div>
            <Button
              className="w-full"
              onClick={() => saveMutation.mutate(form)}
              disabled={!canSave || saveMutation.isPending}
            >
              {saveMutation.isPending
                ? "Saving…"
                : editing
                ? "Update Product"
                : "Create Product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this data product. Existing subscriptions will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
