import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Calendar, Clock } from "lucide-react";
import type { Lead, Campaign } from "@shared/schema";
import { istToUTC, getCurrentISTDate } from "@/lib/timezone";

interface ScheduleCallbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: (Lead & { campaign?: Campaign }) | null;
}

export function ScheduleCallbackDialog({
  open,
  onOpenChange,
  lead,
}: ScheduleCallbackDialogProps) {
  const { toast } = useToast();
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [notes, setNotes] = useState("");

  const scheduleMutation = useMutation({
    mutationFn: async (data: { leadId: string; scheduledFor: string; notes: string }) => {
      return await apiRequest("POST", "/api/schedules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/upcoming"] });
      toast({
        title: "Success",
        description: "Callback scheduled successfully",
      });
      handleClose();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule callback",
        variant: "destructive",
      });
    },
  });

  const handleSchedule = () => {
    if (!lead || !scheduledDate || !scheduledTime) {
      toast({
        title: "Error",
        description: "Please select date and time",
        variant: "destructive",
      });
      return;
    }

    // Convert IST input to UTC for storage
    const utcDate = istToUTC(scheduledDate, scheduledTime);
    const scheduledFor = utcDate.toISOString();
    
    scheduleMutation.mutate({ 
      leadId: lead.id, 
      scheduledFor,
      notes 
    });
  };

  const handleClose = () => {
    setScheduledDate("");
    setScheduledTime("");
    setNotes("");
  };

  // Get minimum date (today in IST)
  const today = getCurrentISTDate();

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
          <DialogTitle>Schedule Callback</DialogTitle>
        </DialogHeader>

        {lead && (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{lead.name}</p>
              <p className="text-sm text-muted-foreground">
                {lead.campaign?.name} • {lead.phone}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-date">Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="schedule-date"
                    type="date"
                    min={today}
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full pl-10 pr-3 h-9 rounded-md border border-input bg-background text-sm"
                    data-testid="input-schedule-date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-time">Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="schedule-time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full pl-10 pr-3 h-9 rounded-md border border-input bg-background text-sm"
                    data-testid="input-schedule-time"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule-notes">Notes (optional)</Label>
              <Textarea
                id="schedule-notes"
                placeholder="Add any notes for this callback..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                data-testid="input-schedule-notes"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  handleClose();
                  onOpenChange(false);
                }} 
                data-testid="button-cancel-schedule"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSchedule}
                disabled={!scheduledDate || !scheduledTime || scheduleMutation.isPending}
                data-testid="button-confirm-schedule"
              >
                {scheduleMutation.isPending ? (
                  <>Scheduling...</>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Callback
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
