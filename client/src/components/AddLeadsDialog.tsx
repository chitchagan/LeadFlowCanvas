import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import type { Campaign } from "@shared/schema";

interface AddLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
}

interface LeadInput {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  timeSpentOnWorkshop: string;
  location: string;
}

export function AddLeadsDialog({ open, onOpenChange, campaign }: AddLeadsDialogProps) {
  const { toast } = useToast();
  const [leads, setLeads] = useState<LeadInput[]>([
    { id: Math.random().toString(), name: "", email: "", phone: "", role: "", timeSpentOnWorkshop: "", location: "" }
  ]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const validLeads = leads.filter((lead) => lead.name.trim() && lead.phone.trim() && lead.role.trim());
      if (validLeads.length === 0) {
        throw new Error("At least one lead with name, phone, and role is required");
      }

      return await apiRequest("POST", "/api/leads/bulk", {
        campaignId: campaign.id,
        leads: validLeads.map(({ id, ...lead }) => ({ ...lead, campaignId: campaign.id })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/unassigned-leads"] });
      toast({
        title: "Leads added",
        description: "Leads have been added to the campaign successfully",
      });
      setLeads([{ id: Math.random().toString(), name: "", email: "", phone: "", role: "", timeSpentOnWorkshop: "", location: "" }]);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add leads",
        variant: "destructive",
      });
    },
  });

  const addLead = () => {
    setLeads([...leads, { id: Math.random().toString(), name: "", email: "", phone: "", role: "", timeSpentOnWorkshop: "", location: "" }]);
  };

  const removeLead = (id: string) => {
    if (leads.length === 1) return;
    setLeads(leads.filter((lead) => lead.id !== id));
  };

  const updateLead = (id: string, field: keyof LeadInput, value: string) => {
    setLeads(leads.map((lead) => (lead.id === id ? { ...lead, [field]: value } : lead)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Leads to {campaign.name}</DialogTitle>
          <DialogDescription>
            Add one or more leads to this campaign
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {leads.map((lead, index) => (
              <div key={lead.id} className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Lead {index + 1}</h4>
                  {leads.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6"
                      onClick={() => removeLead(lead.id)}
                      data-testid={`button-remove-lead-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={`name-${lead.id}`} className="text-xs">Name *</Label>
                    <Input
                      id={`name-${lead.id}`}
                      placeholder="John Doe"
                      value={lead.name}
                      onChange={(e) => updateLead(lead.id, "name", e.target.value)}
                      data-testid={`input-lead-name-${index}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`email-${lead.id}`} className="text-xs">Email</Label>
                    <Input
                      id={`email-${lead.id}`}
                      type="email"
                      placeholder="john@example.com"
                      value={lead.email}
                      onChange={(e) => updateLead(lead.id, "email", e.target.value)}
                      data-testid={`input-lead-email-${index}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`phone-${lead.id}`} className="text-xs">Phone *</Label>
                    <Input
                      id={`phone-${lead.id}`}
                      placeholder="+1234567890"
                      value={lead.phone}
                      onChange={(e) => updateLead(lead.id, "phone", e.target.value)}
                      data-testid={`input-lead-phone-${index}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`role-${lead.id}`} className="text-xs">Role *</Label>
                    <Input
                      id={`role-${lead.id}`}
                      placeholder="Manager"
                      value={lead.role}
                      onChange={(e) => updateLead(lead.id, "role", e.target.value)}
                      data-testid={`input-lead-role-${index}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`timeSpentOnWorkshop-${lead.id}`} className="text-xs">Time Spent on Workshop</Label>
                    <Input
                      id={`timeSpentOnWorkshop-${lead.id}`}
                      placeholder="2 hours"
                      value={lead.timeSpentOnWorkshop}
                      onChange={(e) => updateLead(lead.id, "timeSpentOnWorkshop", e.target.value)}
                      data-testid={`input-lead-time-${index}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`location-${lead.id}`} className="text-xs">Location</Label>
                    <Input
                      id={`location-${lead.id}`}
                      placeholder="New York"
                      value={lead.location}
                      onChange={(e) => updateLead(lead.id, "location", e.target.value)}
                      data-testid={`input-lead-location-${index}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addLead}
            className="w-full"
            data-testid="button-add-another-lead"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Lead
          </Button>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-leads"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
              data-testid="button-submit-leads"
            >
              {createMutation.isPending ? "Adding..." : `Add ${leads.length} Lead${leads.length > 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
