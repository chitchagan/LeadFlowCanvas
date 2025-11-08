import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | undefined>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnMount: "always", // Always refetch on mount, even if data exists
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnReconnect: true, // Refetch on network reconnect
    staleTime: 0, // Always consider stale
    gcTime: 0, // Don't cache
  });

  return {
    user: user || null,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isSupportAssistant: user?.role === "support_assistant",
  };
}
