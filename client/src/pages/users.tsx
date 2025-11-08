import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users as UsersIcon, Shield, UserCircle } from "lucide-react";
import { CreateUserDialog } from "@/components/CreateUserDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import type { User } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Users() {
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users, isLoading } = useQuery<(User & { leadCount: number })[]>({
    queryKey: ["/api/admin/users"],
  });

  const filteredUsers = users?.filter((user) => {
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase();
    const email = user.email?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  const adminCount = users?.filter((u) => u.role === "admin").length || 0;
  const assistantCount = users?.filter((u) => u.role === "support_assistant").length || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage team members and their roles
          </p>
        </div>
        <Button 
          onClick={() => setShowUserDialog(true)}
          data-testid="button-new-user"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Total Users
            </CardTitle>
            <UsersIcon className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono" data-testid="stat-total-users">
              {users?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Admins
            </CardTitle>
            <Shield className="w-5 h-5 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono" data-testid="stat-admins">
              {adminCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Support Staff
            </CardTitle>
            <UserCircle className="w-5 h-5 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono" data-testid="stat-support-staff">
              {assistantCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 max-w-md"
          data-testid="input-search-users"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover-elevate"
                  data-testid={`user-${user.id}`}
                >
                  <UserAvatar user={user} size="md" showRole />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">
                        {user.firstName} {user.lastName}
                      </h3>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        data-testid={`badge-role-${user.id}`}
                      >
                        {user.role === "admin" ? "Admin" : "Support"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  {user.role === "support_assistant" && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Leads</p>
                      <p className="font-mono font-bold" data-testid={`user-lead-count-${user.id}`}>
                        {user.leadCount || 0}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <UsersIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No users found</p>
              <p className="text-sm text-muted-foreground mb-6">
                {searchQuery ? "Try a different search term" : "Add team members to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowUserDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateUserDialog
        open={showUserDialog}
        onOpenChange={setShowUserDialog}
      />
    </div>
  );
}
