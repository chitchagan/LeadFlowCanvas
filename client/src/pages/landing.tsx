import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutDashboard, Users, TrendingUp, Shield } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

export default function Landing() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      const user = await response.json();
      
      // Update query cache
      queryClient.setQueryData(["/api/user"], user);

      // Redirect based on role
      if (user.role === "admin") {
        setLocation("/");
      } else {
        setLocation("/support");
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          {/* Left: Login Form */}
          <div className="w-full lg:w-1/2">
            <div className="text-center lg:text-left mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-6">
                <span className="text-primary-foreground font-bold text-2xl">LM</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Lead Manager
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Sign in to access your dashboard
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>Enter your credentials to continue</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      data-testid="input-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      data-testid="input-password"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                    data-testid="button-login"
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right: Features */}
          <div className="w-full lg:w-1/2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <LayoutDashboard className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Campaign Management</CardTitle>
                  <CardDescription className="text-sm">
                    Organize leads into campaigns for better tracking
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center mb-3">
                    <Users className="w-5 h-5 text-chart-2" />
                  </div>
                  <CardTitle className="text-lg">Team Collaboration</CardTitle>
                  <CardDescription className="text-sm">
                    Assign leads to support assistants efficiently
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-lg bg-chart-3/10 flex items-center justify-center mb-3">
                    <TrendingUp className="w-5 h-5 text-chart-3" />
                  </div>
                  <CardTitle className="text-lg">Performance Analytics</CardTitle>
                  <CardDescription className="text-sm">
                    Track lead status and team performance metrics
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center mb-3">
                    <Shield className="w-5 h-5 text-destructive" />
                  </div>
                  <CardTitle className="text-lg">Role-Based Access</CardTitle>
                  <CardDescription className="text-sm">
                    Secure admin and support assistant permissions
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
