import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { LeadFilters } from "@/components/LeadFilters";
import { 
  FolderKanban, 
  Users, 
  TrendingUp, 
  CheckCircle2,
  Plus,
  Search,
  MoreHorizontal,
  Upload,
  UserCheck,
  Download,
  Calendar as CalendarIcon,
  X,
  ChevronDown,
  Info,
} from "lucide-react";
import { useState } from "react";
import { CreateCampaignDialog } from "@/components/CreateCampaignDialog";
import { CreateUserDialog } from "@/components/CreateUserDialog";
import { ImportLeadsDialog } from "@/components/ImportLeadsDialog";
import { ReassignLeadDialog } from "@/components/ReassignLeadDialog";
import { LeadDetailsDialog } from "@/components/LeadDetailsDialog";
import { StatusManagementDialog } from "@/components/StatusManagementDialog";
import { Input } from "@/components/ui/input";
import type { Campaign, Lead, User as UserType } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CommentsSection } from "@/components/CommentsSection";

export default function AdminDashboard() {
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<(Lead & { campaign?: Campaign }) | null>(null);
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    text: "",
    status: "",
    campaignId: "",
    assignedToId: "",
    dateFrom: "",
    dateTo: "",
  });
  const [analyticsDateFrom, setAnalyticsDateFrom] = useState("");
  const [analyticsDateTo, setAnalyticsDateTo] = useState("");

  const buildStatsQuery = () => {
    const params = new URLSearchParams();
    if (analyticsDateFrom) params.append("dateFrom", analyticsDateFrom);
    if (analyticsDateTo) params.append("dateTo", analyticsDateTo);
    return params.toString() ? `/api/admin/stats?${params.toString()}` : "/api/admin/stats";
  };

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalCampaigns: number;
    activeLeads: number;
    totalAssistants: number;
    completedLeads: number;
  }>({
    queryKey: ["/api/admin/stats", { dateFrom: analyticsDateFrom, dateTo: analyticsDateTo }],
    queryFn: async () => {
      const response = await fetch(buildStatsQuery());
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<UserType[]>({
    queryKey: ["/api/admin/users"],
  });

  const buildSearchQuery = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return params.toString() ? `/api/leads/search?${params.toString()}` : "/api/leads/search";
  };

  const { data: leads, isLoading: leadsLoading } = useQuery<(Lead & { campaign: Campaign; commentCount: number; assignedTo: UserType | null })[]>({
    queryKey: ["/api/leads/search", filters],
    queryFn: async () => {
      const response = await fetch(buildSearchQuery());
      if (!response.ok) throw new Error("Failed to fetch leads");
      return response.json();
    },
  });

  const { data: assistants, isLoading: assistantsLoading } = useQuery<(UserType & { leadCount: number })[]>({
    queryKey: ["/api/admin/assistants"],
  });

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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight gradient-text">Dashboard</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Monitor campaigns, leads, and team performance
          </p>
        </div>
        <div className="flex gap-2 sm:flex-shrink-0">
          <Button 
            onClick={() => setShowStatusDialog(true)}
            variant="outline"
            size="sm"
            data-testid="button-manage-statuses"
            className="flex-1 sm:flex-none"
            aria-label="Manage Statuses"
          >
            <MoreHorizontal className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Manage Statuses</span>
          </Button>
          <Button 
            onClick={() => setShowUserDialog(true)}
            variant="outline"
            size="sm"
            data-testid="button-create-user"
            className="flex-1 sm:flex-none"
            aria-label="Add User"
          >
            <Users className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Add User</span>
          </Button>
          <Button 
            onClick={() => setShowCampaignDialog(true)}
            size="sm"
            data-testid="button-create-campaign"
            className="flex-1 sm:flex-none"
            aria-label="New Campaign"
          >
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">New Campaign</span>
          </Button>
        </div>
      </div>

      {/* Analytics Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Analytics & Export
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="date"
                  value={analyticsDateFrom}
                  onChange={(e) => setAnalyticsDateFrom(e.target.value)}
                  className="w-full pl-10 pr-3 h-9 rounded-md border border-input bg-background text-sm"
                  data-testid="input-analytics-from-date"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="date"
                  value={analyticsDateTo}
                  onChange={(e) => setAnalyticsDateTo(e.target.value)}
                  className="w-full pl-10 pr-3 h-9 rounded-md border border-input bg-background text-sm"
                  data-testid="input-analytics-to-date"
                />
              </div>
            </div>
            {(analyticsDateFrom || analyticsDateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAnalyticsDateFrom("");
                  setAnalyticsDateTo("");
                }}
                data-testid="button-clear-analytics-dates"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                asChild
                data-testid="button-export-leads"
              >
                <a 
                  href={`/api/admin/export/leads?${new URLSearchParams(Object.entries(filters).filter(([_, v]) => v) as any).toString()}`}
                  download
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Leads
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                data-testid="button-export-analytics"
              >
                <a 
                  href={`/api/admin/export/analytics?${new URLSearchParams({ 
                    ...(analyticsDateFrom && { dateFrom: analyticsDateFrom }),
                    ...(analyticsDateTo && { dateTo: analyticsDateTo })
                  } as any).toString()}`}
                  download
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Analytics
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatsCard
              title="Total Campaigns"
              value={stats?.totalCampaigns || 0}
              icon={FolderKanban}
              testId="stat-total-campaigns"
            />
            <StatsCard
              title="Active Leads"
              value={stats?.activeLeads || 0}
              icon={TrendingUp}
              testId="stat-active-leads"
            />
            <StatsCard
              title="Team Members"
              value={stats?.totalAssistants || 0}
              icon={Users}
              testId="stat-team-members"
            />
            <StatsCard
              title="Completed"
              value={stats?.completedLeads || 0}
              icon={CheckCircle2}
              testId="stat-completed-leads"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaigns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Campaigns</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search campaigns..." 
                  className="pl-9"
                  data-testid="input-search-campaigns"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {campaignsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : campaigns && campaigns.length > 0 ? (
              <div className="space-y-2">
                {campaigns.slice(0, 5).map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                    data-testid={`campaign-${campaign.id}`}
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{campaign.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {campaign.description || "No description"}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No campaigns yet</p>
                <Button 
                  className="mt-4" 
                  onClick={() => setShowCampaignDialog(true)}
                  data-testid="button-create-first-campaign"
                >
                  Create Your First Campaign
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {assistantsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : assistants && assistants.length > 0 ? (
              <div className="space-y-3">
                {assistants.slice(0, 5).map((assistant) => (
                  <div
                    key={assistant.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover-elevate"
                    data-testid={`assistant-${assistant.id}`}
                  >
                    <UserAvatar user={assistant} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {assistant.firstName} {assistant.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {assistant.leadCount || 0} leads
                      </p>
                    </div>
                    <div className="font-mono text-sm font-bold">
                      {assistant.leadCount || 0}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No team members yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leads with Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Leads</h2>
          <Button
            onClick={() => setShowImportDialog(true)}
            data-testid="button-import-leads"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
        </div>
        
        <LeadFilters
          campaigns={campaigns || []}
          users={users || []}
          onFilterChange={setFilters}
          showAssignedFilter={true}
        />

        <Card>
          <CardContent className="pt-6">
            {leadsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : leads && leads.length > 0 ? (
              <div className="space-y-1">
                {leads.map((lead) => (
                  <Collapsible 
                    key={lead.id}
                    open={expandedLeads.has(lead.id)}
                    onOpenChange={() => toggleExpanded(lead.id)}
                  >
                    <div className="rounded-lg border" data-testid={`lead-${lead.id}`}>
                      <div className="p-3 space-y-3 sm:space-y-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{lead.name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {lead.campaign?.name || "Unknown Campaign"} • {lead.email}
                            </p>
                            <p className="text-sm text-muted-foreground sm:hidden mt-1">{lead.phone}</p>
                            {lead.assignedTo && (
                              <p className="text-sm text-muted-foreground mt-1 sm:hidden">
                                Assigned to: {lead.assignedTo.firstName} {lead.assignedTo.lastName}
                              </p>
                            )}
                          </div>
                          <div className="hidden sm:flex sm:items-center gap-3">
                            <p className="text-sm text-muted-foreground">{lead.phone}</p>
                            {lead.assignedTo && (
                              <div className="flex items-center gap-2" data-testid={`assigned-to-${lead.id}`}>
                                <UserAvatar user={lead.assignedTo} size="sm" />
                                <span className="text-sm text-muted-foreground">
                                  {lead.assignedTo.firstName} {lead.assignedTo.lastName}
                                </span>
                              </div>
                            )}
                            <StatusBadge status={lead.status} />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedLead(lead);
                                setShowDetailsDialog(true);
                              }}
                              data-testid={`button-info-${lead.id}`}
                            >
                              <Info className="w-4 h-4" />
                            </Button>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`button-toggle-notes-${lead.id}`}
                              >
                                <ChevronDown className={`w-4 h-4 mr-1 transition-transform ${expandedLeads.has(lead.id) ? 'rotate-180' : ''}`} />
                                {expandedLeads.has(lead.id) 
                                  ? `Hide Notes (${lead.commentCount || 0})` 
                                  : `View Notes (${lead.commentCount || 0})`}
                              </Button>
                            </CollapsibleTrigger>
                            {lead.assignedToId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setShowReassignDialog(true);
                                }}
                                data-testid={`button-reassign-${lead.id}`}
                              >
                                <UserCheck className="w-4 h-4 mr-2" />
                                Reassign
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap sm:hidden">
                          <StatusBadge status={lead.status} />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedLead(lead);
                              setShowDetailsDialog(true);
                            }}
                            data-testid={`button-info-${lead.id}`}
                          >
                            <Info className="w-4 h-4" />
                          </Button>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-toggle-notes-${lead.id}`}
                            >
                              <ChevronDown className={`w-4 h-4 mr-1 transition-transform ${expandedLeads.has(lead.id) ? 'rotate-180' : ''}`} />
                              {expandedLeads.has(lead.id) 
                                ? `Hide Notes (${lead.commentCount || 0})` 
                                : `View Notes (${lead.commentCount || 0})`}
                            </Button>
                          </CollapsibleTrigger>
                          {lead.assignedToId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedLead(lead);
                                setShowReassignDialog(true);
                              }}
                              data-testid={`button-reassign-${lead.id}`}
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Reassign
                            </Button>
                          )}
                        </div>
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
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {Object.values(filters).some(v => v) ? "No leads match your filters" : "No leads yet"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateCampaignDialog 
        open={showCampaignDialog} 
        onOpenChange={setShowCampaignDialog} 
      />
      <CreateUserDialog 
        open={showUserDialog} 
        onOpenChange={setShowUserDialog} 
      />
      <ImportLeadsDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        campaigns={campaigns || []}
      />
      <ReassignLeadDialog
        open={showReassignDialog}
        onOpenChange={setShowReassignDialog}
        lead={selectedLead}
        users={users || []}
      />
      <LeadDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        lead={selectedLead}
      />
      <StatusManagementDialog
        open={showStatusDialog}
        onOpenChange={setShowStatusDialog}
      />
    </div>
  );
}
