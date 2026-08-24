import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  marketingEmails: z.boolean().default(false),
  leadAlerts: z.boolean().default(true),
  automationAlerts: z.boolean().default(true),
  dailyDigest: z.boolean().default(false),
  automationEnabled: z.boolean().default(true),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const settingsForm = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      theme: localStorage.getItem("theme") || "system",
      timezone: "America/Los_Angeles",
      emailNotifications: true,
      smsNotifications: false,
      marketingEmails: false,
      leadAlerts: true,
      automationAlerts: true,
      dailyDigest: false,
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
        theme: dbSettings.theme || localStorage.getItem("theme") || "system",
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
      localStorage.setItem("theme", "dark");
    } else if (data.theme === "light") {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      localStorage.setItem("theme", "system");
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
    // In a real app, you would call the backend to delete the user
    toast({ 
      title: "Account marked for deletion", 
      description: "We are processing your request.",
      variant: "destructive"
    });
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
                          <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                          <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                          <SelectItem value="Europe/London">London (GMT)</SelectItem>
                          <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
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

          {/* Notifications */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/10 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" /> Notifications
                </CardTitle>
                <CardDescription>Choose what updates you want to receive.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <FormField control={settingsForm.control} name="emailNotifications" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Global Email Notifications</FormLabel>
                      <div className="text-sm text-muted-foreground">Master switch for all system emails sent to you.</div>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={settingsForm.control} name="leadAlerts" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Lead Alerts</FormLabel>
                      <div className="text-sm text-muted-foreground">Notify me when hot leads are identified or assigned.</div>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={!settingsForm.watch("emailNotifications")} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={settingsForm.control} name="automationAlerts" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Automation Errors</FormLabel>
                      <div className="text-sm text-muted-foreground">Notify me if a workflow execution fails.</div>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={!settingsForm.watch("emailNotifications")} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={settingsForm.control} name="dailyDigest" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Daily Digest</FormLabel>
                      <div className="text-sm text-muted-foreground">Receive a daily summary of lead activity.</div>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={!settingsForm.watch("emailNotifications")} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={settingsForm.control} name="smsNotifications" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm opacity-60">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">SMS Notifications <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Not configured</span></FormLabel>
                      <div className="text-sm text-muted-foreground">Receive urgent alerts via text messages. (Requires SMS provider integration)</div>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled /></FormControl>
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-foreground">Delete Account</h4>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          account and remove your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Yes, delete account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </form>
      </Form>
    </div>
  );
}
