import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown } from "lucide-react";
import { getInitials, getAvatarColor } from "@/lib/authUtils";
import type { User } from "@shared/schema";

interface UserAvatarProps {
  user: Pick<User, "id" | "firstName" | "lastName" | "role">;
  size?: "sm" | "md" | "lg";
  showRole?: boolean;
}

export function UserAvatar({ user, size = "md", showRole = false }: UserAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const fontSize = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const avatarColor = getAvatarColor(user.id);
  const initials = getInitials(user.firstName, user.lastName);

  return (
    <div className="relative inline-block">
      <Avatar className={sizeClasses[size]} data-testid={`avatar-${user.id}`}>
        <AvatarFallback 
          className={fontSize[size]}
          style={{ backgroundColor: avatarColor }}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      {showRole && user.role === "admin" && (
        <div 
          className="absolute -bottom-0.5 -right-0.5 bg-chart-3 rounded-full p-0.5"
          data-testid="icon-admin-crown"
        >
          <Crown className="w-2.5 h-2.5 text-background" />
        </div>
      )}
    </div>
  );
}
