import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Status } from "@shared/schema";

interface StatusManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLOR_OPTIONS = [
  { value: "gray", label: "Gray" },
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "yellow", label: "Yellow" },
  { value: "red", label: "Red" },
  { value: "purple", label: "Purple" },
  { value: "pink", label: "Pink" },
  { value: "orange", label: "Orange" },
];

export function StatusManagementDialog({ open, onOpenChange }: StatusManagementDialogProps) {
  const { toast } = useToast();
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "gray",
  });

  const { data: statuses, isLoading } = useQuery<Status[]>({
    queryKey: ["/api/admin/statuses"],
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/admin/statuses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/statuses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statuses"] });
      setShowCreateForm(false);
      setFormData({ name: "", description: "", color: "gray" });
      toast({
        title: "Status created",
        description: "The status has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create status",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return await apiRequest("PATCH", `/api/admin/statuses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/statuses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statuses"] });
      setEditingStatus(null);
      toast({
        title: "Status updated",
        description: "The status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/statuses/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/statuses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statuses"] });
      toast({
        title: "Status deleted",
        description: "The status has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete status",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Status name is required",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingStatus) return;
    updateMutation.mutate({
      id: editingStatus.id,
      data: {
        name: formData.name,
        description: formData.description,
        color: formData.color,
      },
    });
  };

  const handleDelete = (status: Status) => {
    if (status.isDefault) {
      toast({
        title: "Cannot delete",
        description: "Default statuses cannot be deleted",
        variant: "destructive",
      });
      return;
    }
    deleteMutation.mutate(status.id);
  };

  const startEdit = (status: Status) => {
    setEditingStatus(status);
    setFormData({
      name: status.name,
      description: status.description || "",
      color: status.color,
    });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingStatus(null);
    setShowCreateForm(false);
    setFormData({ name: "", description: "", color: "gray" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="dialog-status-management">
        <DialogHeader>
          <DialogTitle>Manage Statuses</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create/Edit Form */}
          {(showCreateForm || editingStatus) && (
            <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {editingStatus ? "Edit Status" : "Create New Status"}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={cancelEdit}
                  data-testid="button-cancel-form"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="status-name">Status Name</Label>
                  <Input
                    id="status-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Interested in Recorded Course"
                    data-testid="input-status-name"
                  />
                </div>

                <div>
                  <Label htmlFor="status-description">Description (Optional)</Label>
                  <Textarea
                    id="status-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe when to use this status"
                    data-testid="input-status-description"
                  />
                </div>

                <div>
                  <Label htmlFor="status-color">Badge Color</Label>
                  <Select
                    value={formData.color}
                    onValueChange={(value) => setFormData({ ...formData, color: value })}
                  >
                    <SelectTrigger data-testid="select-status-color">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Badge variant={option.value as any}>{option.label}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={editingStatus ? handleUpdate : handleCreate}
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-status"
                  >
                    {editingStatus ? "Update Status" : "Create Status"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelEdit}
                    data-testid="button-cancel-status"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Add New Button */}
          {!showCreateForm && !editingStatus && (
            <Button
              onClick={() => setShowCreateForm(true)}
              data-testid="button-create-status"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Status
            </Button>
          )}

          {/* Statuses List */}
          <div className="space-y-2">
            <h3 className="font-semibold">All Statuses</h3>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : statuses && statuses.length > 0 ? (
              <div className="space-y-2">
                {statuses.map((status) => (
                  <div
                    key={status.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                    data-testid={`status-item-${status.id}`}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        <Badge variant={status.color as any}>{status.name}</Badge>
                        {status.isDefault && (
                          <span className="text-xs text-muted-foreground">(Default)</span>
                        )}
                      </div>
                      {status.description && (
                        <p className="text-sm text-muted-foreground">{status.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(status)}
                        data-testid={`button-edit-${status.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(status)}
                        disabled={status.isDefault || deleteMutation.isPending}
                        data-testid={`button-delete-${status.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No statuses found</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
