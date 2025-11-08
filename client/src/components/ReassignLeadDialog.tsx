import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserCheck } from "lucide-react";
import type { Lead, User, Campaign } from "@shared/schema";

interface ReassignLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: (Lead & { campaign?: Campaign }) | null;
  users: User[];
}

export function ReassignLeadDialog({
  open,
  onOpenChange,
  lead,
  users,
}: ReassignLeadDialogProps) {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const reassignMutation = useMutation({
    mutationFn: async (data: { leadId: string; assignedToId: string }) => {
      return await apiRequest("PATCH", `/api/leads/${data.leadId}/reassign`, {
        assignedToId: data.assignedToId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads/search"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/assistants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/my-leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/unassigned-leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/stats"] });
      toast({
        title: "Success",
        description: "Lead reassigned successfully",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reassign lead",
        variant: "destructive",
      });
    },
  });

  const handleReassign = () => {
    if (!lead || !selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user",
        variant: "destructive",
      });
      return;
    }

    reassignMutation.mutate({ leadId: lead.id, assignedToId: selectedUserId });
  };

  const handleClose = () => {
    setSelectedUserId("");
  };

  // Filter out the currently assigned user
  const availableUsers = users.filter(
    (user) => user.role === "support_assistant" && user.id !== lead?.assignedToId
  );

  const currentAssignee = users.find((user) => user.id === lead?.assignedToId);

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign Lead</DialogTitle>
        </DialogHeader>

        {lead && (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{lead.name}</p>
              <p className="text-sm text-muted-foreground">
                {lead.campaign?.name} • {lead.email}
              </p>
              {currentAssignee && (
                <p className="text-sm text-muted-foreground mt-1">
                  Currently assigned to: {currentAssignee.firstName} {currentAssignee.lastName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="user">Reassign to</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="user" data-testid="select-reassign-user">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.length === 0 ? (
                    <SelectItem value="no-users" disabled>
                      No other support assistants available
                    </SelectItem>
                  ) : (
                    availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {availableUsers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No other support assistants available to reassign this lead
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  handleClose();
                  onOpenChange(false);
                }} 
                data-testid="button-cancel-reassign"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReassign}
                disabled={!selectedUserId || reassignMutation.isPending || availableUsers.length === 0}
                data-testid="button-confirm-reassign"
              >
                {reassignMutation.isPending ? (
                  <>Reassigning...</>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Reassign Lead
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
