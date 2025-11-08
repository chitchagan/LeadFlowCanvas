import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lead, Campaign, User } from "@shared/schema";
import { StatusBadge } from "./StatusBadge";
import { UserAvatar } from "./UserAvatar";
import { format } from "date-fns";
import { utcToIST } from "@/lib/timezone";

interface LeadDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: (Lead & { 
    campaign?: Campaign; 
    assignedTo?: User | null;
    scheduledCallbackAt?: Date | string | null;
    commentCount?: number;
  }) | null;
}

export function LeadDetailsDialog({ open, onOpenChange, lead }: LeadDetailsDialogProps) {
  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-lead-details">
        <DialogHeader>
          <DialogTitle>Lead Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium" data-testid="detail-name">{lead.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium" data-testid="detail-email">{lead.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium" data-testid="detail-phone">{lead.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div data-testid="detail-status">
                  <StatusBadge status={lead.status} />
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Campaign</h3>
            <div>
              <p className="text-sm text-muted-foreground">Campaign Name</p>
              <p className="font-medium" data-testid="detail-campaign">{lead.campaign?.name || "Unknown Campaign"}</p>
            </div>
          </div>

          {/* Professional Details */}
          {(lead.role || lead.location || lead.timeSpentOnWorkshop) && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Professional Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {lead.role && (
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <p className="font-medium" data-testid="detail-role">{lead.role}</p>
                  </div>
                )}
                {lead.location && (
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium" data-testid="detail-location">{lead.location}</p>
                  </div>
                )}
                {lead.timeSpentOnWorkshop && (
                  <div>
                    <p className="text-sm text-muted-foreground">Time Spent on Workshop</p>
                    <p className="font-medium" data-testid="detail-workshop-time">{lead.timeSpentOnWorkshop}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assignment Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Assignment</h3>
            {lead.assignedTo ? (
              <div className="flex items-center gap-3">
                <UserAvatar user={lead.assignedTo} size="md" />
                <div>
                  <p className="font-medium" data-testid="detail-assigned-to">
                    {lead.assignedTo.firstName} {lead.assignedTo.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{lead.assignedTo.email}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground" data-testid="detail-unassigned">Not assigned</p>
            )}
          </div>

          {/* Callback Information */}
          {lead.scheduledCallbackAt && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Scheduled Callback</h3>
              <div>
                <p className="text-sm text-muted-foreground">Callback Time (IST)</p>
                <p className="font-medium" data-testid="detail-callback">
                  {utcToIST(new Date(lead.scheduledCallbackAt), 'full')}
                </p>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Timeline</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {lead.createdAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p className="font-medium" data-testid="detail-created">
                    {format(new Date(lead.createdAt), "PPP 'at' p")}
                  </p>
                </div>
              )}
              {lead.updatedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium" data-testid="detail-updated">
                    {format(new Date(lead.updatedAt), "PPP 'at' p")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Notes/Comments Section Info */}
          {lead.commentCount !== undefined && lead.commentCount > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Notes & Comments</h3>
              <p className="text-muted-foreground" data-testid="detail-comments">
                This lead has {lead.commentCount} {lead.commentCount === 1 ? 'note' : 'notes'}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
