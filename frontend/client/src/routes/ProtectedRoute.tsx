import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  userOnly?: boolean;
}

/**
 * Protect all private routes.
 * Blocks admins from user-only routes and users from admin-only routes.
 */
export function ProtectedRoute({ children, adminOnly = false, userOnly = false }: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        setLocation("/login");
      } else {
        const isAdmin = userProfile?.role === "admin";
        
        if (adminOnly && !isAdmin) {
          toast({
            title: "Access Denied",
            description: "You do not have permission to view the Admin Panel.",
            variant: "destructive"
          });
          setLocation("/dashboard");
        } else if (userOnly && isAdmin) {
          setLocation("/admin");
        }
      }
    }
  }, [user, userProfile, loading, adminOnly, userOnly, setLocation, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;
  
  const isAdmin = userProfile?.role === "admin";
  if (adminOnly && !isAdmin) return null;
  if (userOnly && isAdmin) return null;

  return <>{children}</>;
}

export default ProtectedRoute;
