import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trash2, FolderKanban, Users } from "lucide-react";
import { CreateCampaignDialog } from "@/components/CreateCampaignDialog";
import { AddLeadsDialog } from "@/components/AddLeadsDialog";
import { ManageLeadsDialog } from "@/components/ManageLeadsDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Campaign } from "@shared/schema";
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

export default function Campaigns() {
  const { toast } = useToast();
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [showAddLeadsDialog, setShowAddLeadsDialog] = useState(false);
  const [showManageLeadsDialog, setShowManageLeadsDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: campaigns, isLoading } = useQuery<(Campaign & { leadCount: number })[]>({
    queryKey: ["/api/campaigns"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/campaigns/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Campaign deleted",
        description: "Campaign has been deleted successfully",
      });
      setCampaignToDelete(null);
    },
  });

  const handleAddLeads = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowAddLeadsDialog(true);
  };

  const handleViewLeads = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowManageLeadsDialog(true);
  };

  const filteredCampaigns = campaigns?.filter((campaign) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Manage your campaigns and organize leads
          </p>
        </div>
        <Button 
          onClick={() => setShowCampaignDialog(true)}
          data-testid="button-new-campaign"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search campaigns..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 max-w-md"
          data-testid="input-search-campaigns"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCampaigns && filteredCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="hover-elevate" data-testid={`campaign-card-${campaign.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg line-clamp-1">{campaign.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {campaign.description || "No description"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8"
                    onClick={() => setCampaignToDelete(campaign)}
                    data-testid={`button-delete-${campaign.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Leads</span>
                  <span className="font-mono font-bold" data-testid={`lead-count-${campaign.id}`}>
                    {campaign.leadCount || 0}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewLeads(campaign)}
                    data-testid={`button-view-leads-${campaign.id}`}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    View Leads
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleAddLeads(campaign)}
                    data-testid={`button-add-leads-${campaign.id}`}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Leads
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FolderKanban className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No campaigns found</p>
              <p className="text-sm text-muted-foreground mb-6">
                {searchQuery ? "Try a different search term" : "Create your first campaign to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowCampaignDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <CreateCampaignDialog
        open={showCampaignDialog}
        onOpenChange={setShowCampaignDialog}
      />

      {selectedCampaign && (
        <>
          <AddLeadsDialog
            open={showAddLeadsDialog}
            onOpenChange={setShowAddLeadsDialog}
            campaign={selectedCampaign}
          />
          <ManageLeadsDialog
            open={showManageLeadsDialog}
            onOpenChange={setShowManageLeadsDialog}
            campaign={selectedCampaign}
          />
        </>
      )}

      <AlertDialog open={!!campaignToDelete} onOpenChange={() => setCampaignToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{campaignToDelete?.name}"? This will also delete all associated leads and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => campaignToDelete && deleteMutation.mutate(campaignToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
