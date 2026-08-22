import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

/**
 * 4. Protect all private routes.
 * If user is not authenticated, redirect to /login.
 * 11. Show a loading spinner while authentication is in progress.
 */
export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        setLocation("/login");
      } else if (adminOnly) {
        const isAdmin = 
          user.role === "admin" || 
          userProfile?.role === "admin" || 
          user.email?.toLowerCase() === "sorathiyadhruvin2005@gmail.com";
          
        if (!isAdmin) {
          toast({
            title: "Access Denied",
            description: "You do not have permission to view the Admin Panel.",
            variant: "destructive"
          });
          setLocation("/dashboard");
        }
      }
    }
  }, [user, userProfile, loading, adminOnly, setLocation, toast]);

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

  if (!user) {
    return null;
  }
  
  if (adminOnly) {
    const isAdmin = 
      user.role === "admin" || 
      userProfile?.role === "admin" || 
      user.email?.toLowerCase() === "sorathiyadhruvin2005@gmail.com";
      
    if (!isAdmin) return null;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
