import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, X, Check, ChevronDown } from "lucide-react";
import type { Campaign, Lead } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CommentsSection } from "@/components/CommentsSection";

interface ManageLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
}

interface LeadWithAssignedUser extends Lead {
  assignedUser?: { id: string; username: string } | null;
}

export function ManageLeadsDialog({ open, onOpenChange, campaign }: ManageLeadsDialogProps) {
  const { toast } = useToast();
  const [editingLead, setEditingLead] = useState<string | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<LeadWithAssignedUser | null>(null);
  const [editData, setEditData] = useState<Partial<Lead>>({});
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());

  const { data: leads, isLoading, refetch } = useQuery<LeadWithAssignedUser[]>({
    queryKey: [`/api/campaigns/${campaign.id}/leads`],
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lead> }) => {
      return await apiRequest("PATCH", `/api/leads/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaign.id}/leads`] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Lead updated",
        description: "Lead has been updated successfully",
      });
      setEditingLead(null);
      setEditData({});
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update lead",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/leads/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaign.id}/leads`] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Lead deleted",
        description: "Lead has been deleted successfully",
      });
      setLeadToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lead",
        variant: "destructive",
      });
    },
  });

  const startEdit = (lead: LeadWithAssignedUser) => {
    setEditingLead(lead.id);
    setEditData({
      name: lead.name,
      email: lead.email || "",
      phone: lead.phone,
      role: lead.role,
      timeSpentOnWorkshop: lead.timeSpentOnWorkshop || "",
      location: lead.location || "",
    });
  };

  const cancelEdit = () => {
    setEditingLead(null);
    setEditData({});
  };

  const saveEdit = () => {
    if (editingLead) {
      updateMutation.mutate({ id: editingLead, data: editData });
    }
  };

  const toggleExpanded = (leadId: string) => {
    setExpandedLeads((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Leads - {campaign.name}</DialogTitle>
            <DialogDescription>
              View, edit, and delete leads for this campaign
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 rounded-lg border">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : leads && leads.length > 0 ? (
              <div className="space-y-3">
                {leads.map((lead) => (
                  <Collapsible 
                    key={lead.id} 
                    open={expandedLeads.has(lead.id)}
                    onOpenChange={() => toggleExpanded(lead.id)}
                  >
                    <div className="rounded-lg border" data-testid={`lead-item-${lead.id}`}>
                      <div className="p-4 space-y-3">
                        {editingLead === lead.id ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Name *</Label>
                            <Input
                              value={editData.name || ""}
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              data-testid={`input-edit-name-${lead.id}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Email</Label>
                            <Input
                              type="email"
                              value={editData.email || ""}
                              onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                              data-testid={`input-edit-email-${lead.id}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Phone *</Label>
                            <Input
                              value={editData.phone || ""}
                              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                              data-testid={`input-edit-phone-${lead.id}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Role *</Label>
                            <Input
                              value={editData.role || ""}
                              onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                              data-testid={`input-edit-role-${lead.id}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Time Spent on Workshop</Label>
                            <Input
                              value={editData.timeSpentOnWorkshop || ""}
                              onChange={(e) => setEditData({ ...editData, timeSpentOnWorkshop: e.target.value })}
                              data-testid={`input-edit-time-${lead.id}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Location</Label>
                            <Input
                              value={editData.location || ""}
                              onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                              data-testid={`input-edit-location-${lead.id}`}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelEdit}
                            data-testid={`button-cancel-edit-${lead.id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={saveEdit}
                            disabled={updateMutation.isPending}
                            data-testid={`button-save-edit-${lead.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {updateMutation.isPending ? "Saving..." : "Save"}
                          </Button>
                        </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium" data-testid={`text-lead-name-${lead.id}`}>{lead.name}</h4>
                                <span className="text-sm text-muted-foreground">•</span>
                                <span className="text-sm text-muted-foreground" data-testid={`text-lead-role-${lead.id}`}>{lead.role}</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Phone: </span>
                                  <span data-testid={`text-lead-phone-${lead.id}`}>{lead.phone}</span>
                                </div>
                                {lead.email && (
                                  <div>
                                    <span className="text-muted-foreground">Email: </span>
                                    <span data-testid={`text-lead-email-${lead.id}`}>{lead.email}</span>
                                  </div>
                                )}
                                {lead.timeSpentOnWorkshop && (
                                  <div>
                                    <span className="text-muted-foreground">Time: </span>
                                    <span data-testid={`text-lead-time-${lead.id}`}>{lead.timeSpentOnWorkshop}</span>
                                  </div>
                                )}
                                {lead.location && (
                                  <div>
                                    <span className="text-muted-foreground">Location: </span>
                                    <span data-testid={`text-lead-location-${lead.id}`}>{lead.location}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-muted-foreground">Status: </span>
                                  <span className="capitalize" data-testid={`text-lead-status-${lead.id}`}>{lead.status.replace('_', ' ')}</span>
                                </div>
                                {lead.assignedUser && (
                                  <div>
                                    <span className="text-muted-foreground">Assigned to: </span>
                                    <span data-testid={`text-lead-assigned-${lead.id}`}>{lead.assignedUser.username}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`button-toggle-notes-${lead.id}`}
                                >
                                  <ChevronDown className={`w-4 h-4 mr-1 transition-transform ${expandedLeads.has(lead.id) ? 'rotate-180' : ''}`} />
                                  {expandedLeads.has(lead.id) ? 'Hide Notes' : 'View Notes'}
                                </Button>
                              </CollapsibleTrigger>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8"
                                onClick={() => startEdit(lead)}
                                data-testid={`button-edit-${lead.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 text-destructive"
                                onClick={() => setLeadToDelete(lead)}
                                data-testid={`button-delete-${lead.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                      </div>

                      <CollapsibleContent>
                        <div className="px-4 pb-4 border-t">
                          <div className="pt-4">
                            <CommentsSection leadId={lead.id} />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No leads found for this campaign</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!leadToDelete} onOpenChange={() => setLeadToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{leadToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-lead">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => leadToDelete && deleteMutation.mutate(leadToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-lead"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
