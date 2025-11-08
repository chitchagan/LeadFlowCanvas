import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
import { Textarea } from "@/components/ui/textarea";

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCampaignDialog({ open, onOpenChange }: CreateCampaignDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");
      return await apiRequest("POST", "/api/campaigns", {
        name,
        description,
        createdById: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Campaign created",
        description: "New campaign has been created successfully",
      });
      setName("");
      setDescription("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Campaign name is required",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
          <DialogDescription>
            Add a new campaign to organize and track your leads
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Campaign Name *</Label>
            <Input
              id="campaign-name"
              placeholder="Q1 2024 Product Launch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-campaign-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign-description">Description</Label>
            <Textarea
              id="campaign-description"
              placeholder="Brief description of the campaign goals and target audience"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              data-testid="input-campaign-description"
            />
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-campaign"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
              data-testid="button-submit-campaign"
            >
              {createMutation.isPending ? "Creating..." : "Create Campaign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
