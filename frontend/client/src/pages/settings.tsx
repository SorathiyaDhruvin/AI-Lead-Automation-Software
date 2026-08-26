import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Bell,
  Settings as SettingsIcon,
  X,
  Save,
  Moon,
  Sun,
  Laptop,
  AlertTriangle,
  Trash2,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { settingsService } from "@/services/settings";
import { queryClient } from "@/lib/queryClient";

const settingsSchema = z.object({
  theme: z.string().optional(),
  timezone: z.string().optional(),
  automationEnabled: z.boolean().default(true),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const settingsForm = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      theme: "system",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles",
      automationEnabled: true,
    },
  });

  const { isDirty } = settingsForm.formState;

  // Load settings from API
  const { data: dbSettings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: () => settingsService.get(),
  });

  // Update form when DB settings load
  useEffect(() => {
    if (dbSettings) {
      settingsForm.reset({
        ...dbSettings,
        theme: dbSettings.theme || "system",
        timezone: dbSettings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles",
      });
    }
  }, [dbSettings, settingsForm]);

  // Save settings to API
  const updateSettingsMutation = useMutation({
    mutationFn: (data: SettingsForm) => settingsService.update(data),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(["/api/settings"], updatedSettings);
      settingsForm.reset(updatedSettings); // Reset dirty state
      toast({ title: "Settings saved", description: "Your preferences have been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    },
  });

  const handleSaveSettings = (data: SettingsForm) => {
    // Apply theme immediately
    if (data.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (data.theme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }

    // Persist to DB
    updateSettingsMutation.mutate(data);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") return;
    
    setIsDeleting(true);
    try {
      const res = await fetch("/api/profile/account", { method: "DELETE" });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete account");
      }
      
      toast({ title: "Account Deleted", description: "Your account has been permanently deleted." });
      
      // Sign out and redirect
      await signOut();
      queryClient.clear();
      localStorage.clear();
      setLocation("/login");
    } catch (error: any) {
      toast({ 
        title: "Unable to delete your account", 
        description: error.message || "Please try again.", 
        variant: "destructive" 
      });
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-[1000px] mx-auto w-full pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your application preferences and account security.</p>
        </div>
        
        <AnimatePresence>
          {isDirty && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-3"
            >
              <Button 
                variant="outline" 
                onClick={() => settingsForm.reset()}
                disabled={updateSettingsMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button 
                onClick={settingsForm.handleSubmit(handleSaveSettings)}
                disabled={updateSettingsMutation.isPending}
                className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
              >
                {updateSettingsMutation.isPending ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Form {...settingsForm}>
        <form className="space-y-8">
          {/* Appearance & Region */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/10 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5 text-primary" /> Appearance & Region
                </CardTitle>
                <CardDescription>Customize how the application looks and your timezone.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormField control={settingsForm.control} name="theme" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Theme Preference</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select theme" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="light">
                            <div className="flex items-center gap-2"><Sun className="h-4 w-4" /> Light</div>
                          </SelectItem>
                          <SelectItem value="dark">
                            <div className="flex items-center gap-2"><Moon className="h-4 w-4" /> Dark</div>
                          </SelectItem>
                          <SelectItem value="system">
                            <div className="flex items-center gap-2"><Laptop className="h-4 w-4" /> System Default</div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  <FormField control={settingsForm.control} name="timezone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Zone</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {Intl.supportedValuesOf('timeZone').map(tz => (
                            <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Automation Configuration */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/10 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-primary" /> Automation
                </CardTitle>
                <CardDescription>Global controls for your workflow engine.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <FormField control={settingsForm.control} name="automationEnabled" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Automation Engine</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        If disabled, no workflows will execute regardless of their individual status.
                      </div>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </CardContent>
            </Card>
          </motion.div>


          {/* Danger Zone */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-destructive/20 shadow-sm overflow-hidden">
              <CardHeader className="bg-destructive/5 border-b border-destructive/10 pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" /> Danger Zone
                </CardTitle>
                <CardDescription className="text-destructive/80">Irreversible and destructive actions.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row items-start md:items-center justify-between rounded-lg border p-4 shadow-sm bg-background border-destructive/20">
                  <div className="space-y-0.5">
                    <h4 className="text-base font-semibold text-destructive">Delete Account</h4>
                    <p className="text-sm text-muted-foreground">
                      This action permanently deletes your account and associated data. This cannot be undone.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full md:w-auto">
                    <input 
                      type="text" 
                      placeholder="Type DELETE to confirm" 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                    />
                    <Button 
                      variant="destructive" 
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteAccount();
                      }}
                      disabled={deleteConfirmation !== "DELETE" || isDeleting}
                      className="w-full"
                    >
                      {isDeleting ? "Deleting..." : <><Trash2 className="h-4 w-4 mr-2" /> Delete Account</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </form>
      </Form>
    </div>
  );
}
