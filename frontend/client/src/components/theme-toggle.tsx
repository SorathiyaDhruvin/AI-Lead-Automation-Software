import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { settingsService } from "@/services/settings";
import { queryClient } from "@/lib/queryClient";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: () => settingsService.get(),
    staleTime: Infinity,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => settingsService.update(data),
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/settings"], data);
    }
  });

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));

    const observer = new MutationObserver(() => {
        setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    
    return () => observer.disconnect();
  }, [settings?.theme]);

  const toggleTheme = () => {
    const isCurrentlyDark = document.documentElement.classList.contains("dark");
    const newTheme = isCurrentlyDark ? "light" : "dark";
    
    if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
    } else {
        document.documentElement.classList.remove("dark");
    }
    
    setIsDark(newTheme === "dark");
    updateMutation.mutate({ theme: newTheme });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      disabled={updateMutation.isPending}
      data-testid="button-theme-toggle"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
