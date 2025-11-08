import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Campaign, User, Status } from "@shared/schema";

interface LeadFiltersProps {
  campaigns: Campaign[];
  users?: User[];
  onFilterChange: (filters: {
    text: string;
    status: string;
    campaignId: string;
    assignedToId: string;
    dateFrom: string;
    dateTo: string;
  }) => void;
  showAssignedFilter?: boolean;
}

export function LeadFilters({
  campaigns,
  users = [],
  onFilterChange,
  showAssignedFilter = false,
}: LeadFiltersProps) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("all");
  const [campaignId, setCampaignId] = useState("all");
  const [assignedToId, setAssignedToId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: statuses } = useQuery<Status[]>({
    queryKey: ["/api/statuses"],
  });

  const handleSearch = () => {
    onFilterChange({
      text,
      status: status === "all" ? "" : status,
      campaignId: campaignId === "all" ? "" : campaignId,
      assignedToId: assignedToId === "all" ? "" : assignedToId,
      dateFrom,
      dateTo,
    });
  };

  const handleClear = () => {
    setText("");
    setStatus("all");
    setCampaignId("all");
    setAssignedToId("all");
    setDateFrom("");
    setDateTo("");
    onFilterChange({
      text: "",
      status: "",
      campaignId: "",
      assignedToId: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, or company..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
              data-testid="input-search-leads"
            />
          </div>
        </div>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger data-testid="select-filter-status">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses?.map((status) => (
              <SelectItem key={status.id} value={status.name}>
                {status.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={campaignId} onValueChange={setCampaignId}>
          <SelectTrigger data-testid="select-filter-campaign">
            <SelectValue placeholder="All Campaigns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {campaigns.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                {campaign.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showAssignedFilter && (
          <Select value={assignedToId} onValueChange={setAssignedToId}>
            <SelectTrigger data-testid="select-filter-assigned">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From Date"
            data-testid="input-date-from"
          />
        </div>

        <div>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To Date"
            data-testid="input-date-to"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={handleClear}
          data-testid="button-clear-filters"
        >
          <X className="w-4 h-4 mr-2" />
          Clear
        </Button>
        <Button onClick={handleSearch} data-testid="button-apply-filters">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>
    </div>
  );
}
