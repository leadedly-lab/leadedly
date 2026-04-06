import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Star, DollarSign } from "lucide-react";
import type { Industry } from "@shared/schema";

const ICON_OPTIONS = [
  "TrendingUp", "BarChart2", "Shield", "Home", "Building2",
  "Calculator", "Scale", "Heart", "Sun", "Wrench", "Users", "Briefcase",
  "Car", "Leaf", "Zap", "Globe", "Award",
];

export default function AdminIndustries() {
  const { toast } = useToast();
  const [editIndustry, setEditIndustry] = useState<Industry | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", icon: "TrendingUp", successFee: "250" });

  const { data: industries = [], isLoading } = useQuery<Industry[]>({ queryKey: ["/api/industries"] });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/industries/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/industries"] });
      setEditIndustry(null);
      toast({ title: "Industry updated" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/industries", { ...data, successFee: Number(data.successFee), active: true });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/industries"] });
      setAddOpen(false);
      setNewForm({ name: "", icon: "TrendingUp", successFee: "250" });
      toast({ title: "Industry created" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/industries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/industries"] });
      toast({ title: "Industry removed" });
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Industries & Success Fees</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage industry types and configure per-industry success fees.</p>
        </div>
        <Button onClick={() => setAddOpen(true)} data-testid="button-add-industry">
          <Plus className="w-4 h-4 mr-2" /> Add Industry
        </Button>
      </div>

      {/* Key info card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-sm text-foreground font-medium mb-1">About Success Fees</p>
          <p className="text-xs text-muted-foreground">Success fees are charged per closed lead and deducted from the client's territory deposit. Each industry can have a different fee. The default is $250 per closed client.</p>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)
        ) : industries.map(ind => (
          <Card key={ind.id} className="hover-elevate">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Star className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{ind.name}</p>
                    <Badge variant={ind.active ? "default" : "secondary"} className="text-xs mt-0.5">
                      {ind.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm">
                  <DollarSign className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="font-bold text-yellow-400 tabular">${ind.successFee}</span>
                  <span className="text-xs text-muted-foreground">success fee</span>
                </div>
                <div className="flex gap-1.5">
                  <Button size="icon" variant="ghost" onClick={() => setEditIndustry(ind)} data-testid={`button-edit-industry-${ind.id}`}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(ind.id)} data-testid={`button-delete-industry-${ind.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editIndustry} onOpenChange={() => setEditIndustry(null)}>
        {editIndustry && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">Edit Industry</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Industry Name</Label>
                <Input value={editIndustry.name} onChange={e => setEditIndustry(i => i && ({ ...i, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Success Fee ($)</Label>
                <Input type="number" value={editIndustry.successFee} onChange={e => setEditIndustry(i => i && ({ ...i, successFee: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Icon</Label>
                <Select value={editIndustry.icon} onValueChange={v => setEditIndustry(i => i && ({ ...i, icon: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(icon => <SelectItem key={icon} value={icon}>{icon}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={editIndustry.active ? "active" : "inactive"} onValueChange={v => setEditIndustry(i => i && ({ ...i, active: v === "active" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: editIndustry.id, data: editIndustry })}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Add Industry</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Industry Name</Label>
              <Input placeholder="e.g. Retirement Planning" value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Success Fee ($)</Label>
              <Input type="number" value={newForm.successFee} onChange={e => setNewForm(f => ({ ...f, successFee: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Icon</Label>
              <Select value={newForm.icon} onValueChange={v => setNewForm(f => ({ ...f, icon: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map(icon => <SelectItem key={icon} value={icon}>{icon}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={createMutation.isPending || !newForm.name.trim()} onClick={() => createMutation.mutate(newForm)} data-testid="button-create-industry">
              {createMutation.isPending ? "Creating…" : "Create Industry"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
