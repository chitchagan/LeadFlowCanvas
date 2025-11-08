import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { Lead, Status } from "@shared/schema";

interface StatusBadgeProps {
  status: Lead["status"];
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { data: statuses } = useQuery<Status[]>({
    queryKey: ["/api/statuses"],
  });

  const statusObj = statuses?.find(s => s.name === status);
  
  // Use the color from the database, default to gray if not found
  const color = statusObj?.color || "gray";
  const label = statusObj?.name || status;
  
  return (
    <Badge 
      variant={color as any}
      data-testid={`badge-status-${status}`}
    >
      {label}
    </Badge>
  );
}
