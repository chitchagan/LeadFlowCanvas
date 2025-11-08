import { useQuery, useMutation } from "@tanstack/react-query";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { 
  TrendingUp, 
  CheckCircle2,
  Clock,
  Phone,
  MessageCircle,
  Mic,
  ChevronDown,
  ChevronUp,
  Calendar,
  Info,
  UserX,
  UserPlus,
  Search,
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Lead, Campaign, User as UserType, Status } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordingDialog } from "@/components/RecordingDialog";
import { CommentsSection } from "@/components/CommentsSection";
import { ScheduleCallbackDialog } from "@/components/ScheduleCallbackDialog";
import { ReassignLeadDialog } from "@/components/ReassignLeadDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { utcToIST } from "@/lib/timezone";

export default function SupportDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedLead, setSelectedLead] = useState<(Lead & { campaign?: Campaign }) | null>(null);
  const [showRecordingDialog, setShowRecordingDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("default");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: statuses, isLoading: statusesLoading } = useQuery<Status[]>({
    queryKey: ["/api/statuses"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalAssigned: number;
    inProgress: number;
    completed: number;
  }>({
    queryKey: ["/api/support/stats"],
  });

  const { data: allMyLeads, isLoading: myLeadsLoading } = useQuery<(Lead & { campaign: Campaign })[]>({
    queryKey: ["/api/support/my-leads"],
  });

  const { data: allUnassignedLeads, isLoading: unassignedLoading } = useQuery<(Lead & { campaign: Campaign })[]>({
    queryKey: ["/api/support/unassigned-leads"],
  });

  // Extract unique locations and roles from all leads
  const uniqueLocations = Array.from(
    new Set(
      [...(allMyLeads || []), ...(allUnassignedLeads || [])]
        .map(lead => lead.location)
        .filter((loc): loc is string => !!loc)
    )
  ).sort();

  const uniqueRoles = Array.from(
    new Set(
      [...(allMyLeads || []), ...(allUnassignedLeads || [])]
        .map(lead => lead.role)
        .filter((role): role is string => !!role)
    )
  ).sort();

  // Client-side filtering and sorting function
  const filterAndSortLeads = (leads: (Lead & { campaign: Campaign })[] | undefined) => {
    if (!leads) return leads;
    
    let filtered = leads;
    
    // Filter by search query (name or phone)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(lead => 
        lead.name.toLowerCase().includes(query) ||
        (lead.phone && lead.phone.toLowerCase().includes(query))
      );
    }
    
    // Filter by campaign
    if (selectedCampaignId !== "all") {
      filtered = filtered.filter(lead => lead.campaign?.id === selectedCampaignId);
    }
    
    // Filter by location
    if (selectedLocation !== "all") {
      filtered = filtered.filter(lead => lead.location === selectedLocation);
    }
    
    // Filter by role
    if (selectedRole !== "all") {
      filtered = filtered.filter(lead => lead.role === selectedRole);
    }
    
    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter(lead => lead.status === selectedStatus);
    }
    
    // Sort by time on workshop
    if (sortBy === "timeAsc") {
      filtered = [...filtered].sort((a, b) => {
        const timeA = a.timeSpentOnWorkshop || "";
        const timeB = b.timeSpentOnWorkshop || "";
        return timeA.localeCompare(timeB);
      });
    } else if (sortBy === "timeDesc") {
      filtered = [...filtered].sort((a, b) => {
        const timeA = a.timeSpentOnWorkshop || "";
        const timeB = b.timeSpentOnWorkshop || "";
        return timeB.localeCompare(timeA);
      });
    }
    
    return filtered;
  };

  const myLeads = filterAndSortLeads(allMyLeads);
  const unassignedLeads = filterAndSortLeads(allUnassignedLeads);

  const { data: upcomingSchedules } = useQuery<any[]>({
    queryKey: ["/api/schedules/upcoming"],
  });

  const { data: allUsers } = useQuery<UserType[]>({
    queryKey: ["/api/support/assistants"],
  });

  const assignMutation = useMutation({
    mutationFn: async (leadId: string) => {
      return await apiRequest("POST", `/api/leads/${leadId}/assign`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/my-leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/unassigned-leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/stats"] });
      toast({
        title: "Lead assigned",
        description: "Lead has been assigned to you successfully",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/leads/${leadId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/my-leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/stats"] });
      toast({
        title: "Status updated",
        description: "Lead status has been updated successfully",
      });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async (leadId: string) => {
      return await apiRequest("PATCH", `/api/leads/${leadId}/unassign`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/my-leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/unassigned-leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/stats"] });
      toast({
        title: "Lead unassigned",
        description: "Lead has been returned to the common pool",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unassign lead",
        variant: "destructive",
      });
    },
  });

  const handleRecord = (lead: Lead) => {
    setSelectedLead(lead);
    setShowRecordingDialog(true);
  };

  const handleSchedule = (lead: Lead & { campaign?: Campaign }) => {
    setSelectedLead(lead);
    setShowScheduleDialog(true);
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
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight gradient-text">My Leads</h1>
            <p className="text-muted-foreground mt-2 text-base">
              Manage your assigned leads and track progress
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-leads"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Campaign:</span>
              <Select
                value={selectedCampaignId}
                onValueChange={setSelectedCampaignId}
              >
                <SelectTrigger className="w-48" data-testid="select-campaign-filter">
                  <SelectValue placeholder="All Campaigns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns?.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Location:</span>
            <Select
              value={selectedLocation}
              onValueChange={setSelectedLocation}
            >
              <SelectTrigger className="w-40" data-testid="select-location-filter">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {uniqueLocations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Role:</span>
            <Select
              value={selectedRole}
              onValueChange={setSelectedRole}
            >
              <SelectTrigger className="w-40" data-testid="select-role-filter">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {uniqueRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select
              value={selectedStatus}
              onValueChange={setSelectedStatus}
              disabled={statusesLoading}
            >
              <SelectTrigger className="w-52" data-testid="select-status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses?.map((status) => (
                  <SelectItem key={status.name} value={status.name}>
                    {status.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Select
              value={sortBy}
              onValueChange={setSortBy}
            >
              <SelectTrigger className="w-52" data-testid="select-sort">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="timeAsc">Time on Workshop (Low to High)</SelectItem>
                <SelectItem value="timeDesc">Time on Workshop (High to Low)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statsLoading ? (
          <>
            {[1, 2, 3].map((i) => (
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
              title="My Leads"
              value={stats?.totalAssigned || 0}
              icon={TrendingUp}
              testId="stat-my-leads"
            />
            <StatsCard
              title="In Progress"
              value={stats?.inProgress || 0}
              icon={Clock}
              testId="stat-in-progress"
            />
            <StatsCard
              title="Completed"
              value={stats?.completed || 0}
              icon={CheckCircle2}
              testId="stat-completed"
            />
          </>
        )}
      </div>

      {/* Upcoming Callbacks */}
      {upcomingSchedules && upcomingSchedules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Callbacks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingSchedules.slice(0, 5).map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  data-testid={`schedule-${schedule.id}`}
                >
                  <div className="flex-1">
                    <p className="font-medium">{schedule.lead.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {schedule.lead.campaign?.name} • {utcToIST(schedule.scheduledFor)}
                    </p>
                    {schedule.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{schedule.notes}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild={!!schedule.lead.phone}
                    disabled={!schedule.lead.phone}
                  >
                    {schedule.lead.phone ? (
                      <a 
                        href={`tel:${schedule.lead.phone}`}
                        data-testid={`button-call-scheduled-${schedule.id}`}
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    ) : (
                      <span data-testid={`button-call-scheduled-${schedule.id}`}>
                        <Phone className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="assigned" className="space-y-6">
        <TabsList>
          <TabsTrigger value="assigned" data-testid="tab-assigned-leads">
            Assigned to Me ({myLeads?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="unassigned" data-testid="tab-unassigned-leads">
            Available Leads ({unassignedLeads?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assigned">
          <Card>
            <CardHeader>
              <CardTitle>My Assigned Leads</CardTitle>
            </CardHeader>
            <CardContent>
              {myLeadsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : myLeads && myLeads.length > 0 ? (
                <div className="space-y-2">
                  {myLeads.map((lead) => {
                    const isExpanded = expandedLeads.has(lead.id);
                    return (
                      <Collapsible
                        key={lead.id}
                        open={isExpanded}
                        onOpenChange={() => toggleExpanded(lead.id)}
                      >
                        <div
                          className="rounded-lg border"
                          data-testid={`my-lead-${lead.id}`}
                        >
                          <div className="p-4 space-y-3">
                            {/* Line 1: Name */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-base">{lead.name}</h3>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="w-6 h-6"
                                      data-testid={`button-info-${lead.id}`}
                                    >
                                      <Info className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80" align="start">
                                    <div className="space-y-3">
                                      <h4 className="font-medium">Lead Details</h4>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Campaign:</span>
                                          <span className="font-medium" data-testid={`text-info-campaign-${lead.id}`}>{lead.campaign?.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Role:</span>
                                          <span className="font-medium" data-testid={`text-info-role-${lead.id}`}>{lead.role}</span>
                                        </div>
                                        {lead.timeSpentOnWorkshop && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Time on Workshop:</span>
                                            <span className="font-medium" data-testid={`text-info-time-${lead.id}`}>{lead.timeSpentOnWorkshop}</span>
                                          </div>
                                        )}
                                        {lead.location && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Location:</span>
                                            <span className="font-medium" data-testid={`text-info-location-${lead.id}`}>{lead.location}</span>
                                          </div>
                                        )}
                                        {lead.email && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Email:</span>
                                            <span className="font-medium text-xs truncate" data-testid={`text-info-email-${lead.id}`}>{lead.email}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8"
                                  data-testid={`button-expand-${lead.id}`}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                            
                            {/* Line 2: Phone Number */}
                            <div className="text-sm text-muted-foreground">
                              {lead.phone || "No phone number"}
                            </div>
                            
                            {/* Line 3: Status */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Status:</span>
                                <StatusBadge status={lead.status} />
                              </div>
                              <Select
                                value={lead.status}
                                onValueChange={(status) => 
                                  updateStatusMutation.mutate({ leadId: lead.id, status })
                                }
                                disabled={statusesLoading}
                              >
                                <SelectTrigger className="w-[180px]" data-testid={`select-status-${lead.id}`}>
                                  <SelectValue placeholder={statusesLoading ? "Loading..." : "Change status..."} />
                                </SelectTrigger>
                                <SelectContent>
                                  {statuses && statuses.length > 0 ? (
                                    statuses.map((status) => (
                                      <SelectItem key={status.id} value={status.name}>
                                        {status.name}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="p-2 text-sm text-muted-foreground">No statuses available</div>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Line 4: Action Buttons */}
                            <div className="flex items-center gap-1 pt-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild={!!lead.phone}
                                disabled={!lead.phone}
                              >
                                {lead.phone ? (
                                  <a 
                                    href={`tel:${lead.phone}`}
                                    data-testid={`button-call-${lead.id}`}
                                  >
                                    <Phone className="w-4 h-4" />
                                  </a>
                                ) : (
                                  <span data-testid={`button-call-${lead.id}`}>
                                    <Phone className="w-4 h-4" />
                                  </span>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild={!!lead.phone}
                                disabled={!lead.phone}
                              >
                                {lead.phone ? (
                                  <a 
                                    href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-testid={`button-whatsapp-${lead.id}`}
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                  </a>
                                ) : (
                                  <span data-testid={`button-whatsapp-${lead.id}`}>
                                    <MessageCircle className="w-4 h-4" />
                                  </span>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSchedule(lead)}
                                data-testid={`button-schedule-${lead.id}`}
                              >
                                <Calendar className="w-4 h-4" />
                              </Button>
                              {/* Microphone button hidden - audio upload feature not working */}
                              {/* <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRecord(lead)}
                                data-testid={`button-record-${lead.id}`}
                              >
                                <Mic className="w-4 h-4" />
                              </Button> */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setShowReassignDialog(true);
                                }}
                                data-testid={`button-reassign-${lead.id}`}
                              >
                                <UserPlus className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => unassignMutation.mutate(lead.id)}
                                disabled={unassignMutation.isPending}
                                data-testid={`button-unassign-${lead.id}`}
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <CollapsibleContent>
                            <div className="px-4 pb-4">
                              <CommentsSection leadId={lead.id} />
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No leads assigned yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Check the Available Leads tab to assign leads to yourself
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unassigned">
          <Card>
            <CardHeader>
              <CardTitle>Available Leads</CardTitle>
            </CardHeader>
            <CardContent>
              {unassignedLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : unassignedLeads && unassignedLeads.length > 0 ? (
                <div className="space-y-2">
                  {unassignedLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="p-4 rounded-lg border space-y-3"
                      data-testid={`unassigned-lead-${lead.id}`}
                    >
                      {/* Line 1: Name */}
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-base">{lead.name}</h3>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-6 h-6"
                              data-testid={`button-info-unassigned-${lead.id}`}
                            >
                              <Info className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80" align="start">
                            <div className="space-y-3">
                              <h4 className="font-medium">Lead Details</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Campaign:</span>
                                  <span className="font-medium" data-testid={`text-info-campaign-unassigned-${lead.id}`}>{lead.campaign?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Role:</span>
                                  <span className="font-medium" data-testid={`text-info-role-unassigned-${lead.id}`}>{lead.role}</span>
                                </div>
                                {lead.timeSpentOnWorkshop && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Time on Workshop:</span>
                                    <span className="font-medium" data-testid={`text-info-time-unassigned-${lead.id}`}>{lead.timeSpentOnWorkshop}</span>
                                  </div>
                                )}
                                {lead.location && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Location:</span>
                                    <span className="font-medium" data-testid={`text-info-location-unassigned-${lead.id}`}>{lead.location}</span>
                                  </div>
                                )}
                                {lead.email && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Email:</span>
                                    <span className="font-medium text-xs truncate" data-testid={`text-info-email-unassigned-${lead.id}`}>{lead.email}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      {/* Line 2: Phone Number */}
                      <div className="text-sm text-muted-foreground">
                        {lead.phone || "No phone number"}
                      </div>
                      
                      {/* Line 3: Status */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <StatusBadge status={lead.status} />
                      </div>

                      {/* Line 4: Action Button */}
                      <div>
                        <Button
                          onClick={() => assignMutation.mutate(lead.id)}
                          disabled={assignMutation.isPending}
                          data-testid={`button-assign-${lead.id}`}
                          className="w-full"
                        >
                          Assign to Me
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No available leads</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    All leads have been assigned
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedLead && (
        <>
          <RecordingDialog
            open={showRecordingDialog}
            onOpenChange={setShowRecordingDialog}
            lead={selectedLead}
          />
          <ScheduleCallbackDialog
            open={showScheduleDialog}
            onOpenChange={setShowScheduleDialog}
            lead={selectedLead}
          />
          <ReassignLeadDialog
            open={showReassignDialog}
            onOpenChange={setShowReassignDialog}
            lead={selectedLead}
            users={allUsers || []}
          />
        </>
      )}
    </div>
  );
}
