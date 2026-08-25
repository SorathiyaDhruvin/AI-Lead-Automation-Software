import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Settings as SettingsIcon,
  X,
  Save,
  Moon,
  Sun,
  Laptop,
  Workflow,
  Shield,
  Server
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { settingsService } from "@/services/settings";
import { adminService } from "@/services/admin";
import { queryClient } from "@/lib/queryClient";

const adminSettingsSchema = z.object({
  theme: z.string().optional(),
  timezone: z.string().optional(),
  automationEngineEnabled: z.boolean().default(true),
});

type AdminSettingsForm = z.infer<typeof adminSettingsSchema>;

export default function AdminSettingsPage() {
  const { toast } = useToast();

  const settingsForm = useForm<AdminSettingsForm>({
    resolver: zodResolver(adminSettingsSchema),
    defaultValues: {
      theme: "system",
      timezone: "America/Los_Angeles",
      automationEngineEnabled: true,
    },
  });

  const { isDirty } = settingsForm.formState;

  // Load personal admin settings
  const { data: dbSettings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: () => settingsService.get(),
  });

  // Load platform settings
  const { data: platformSettings, isLoading: isPlatformLoading } = useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn: () => adminService.getPlatformSettings(),
  });

  // Update form when DB settings load
  useEffect(() => {
    if (dbSettings || platformSettings) {
      settingsForm.reset({
        theme: dbSettings?.theme || "system",
        timezone: dbSettings?.timezone || "America/Los_Angeles",
        automationEngineEnabled: platformSettings?.automationEngineEnabled ?? true,
      });
    }
  }, [dbSettings, platformSettings, settingsForm]);

  const updatePersonalSettingsMutation = useMutation({
    mutationFn: (data: any) => settingsService.update(data),
  });

  const updatePlatformSettingsMutation = useMutation({
    mutationFn: (data: any) => adminService.updatePlatformSettings(data),
  });

  const handleSaveSettings = async (data: AdminSettingsForm) => {
    try {
      // 1. Save Personal Settings
      await updatePersonalSettingsMutation.mutateAsync({
        theme: data.theme,
        timezone: data.timezone,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });

      // 2. Save Platform Settings
      await updatePlatformSettingsMutation.mutateAsync({
        automationEngineEnabled: data.automationEngineEnabled,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });

      // Reset dirty state with new values
      settingsForm.reset(data);

      toast({ title: "Settings saved", description: "Admin preferences and platform settings have been updated." });

      // Apply theme globally immediately
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
    } catch (error) {
      toast({ title: "Error", description: "Unable to save settings. Please try again.", variant: "destructive" });
      console.error("Save settings error:", error);
    }
  };

  if (isSettingsLoading || isPlatformLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading admin settings...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-[1000px] mx-auto w-full pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" /> Admin Settings
          </h1>
          <p className="text-muted-foreground mt-1">Manage global platform configurations and your personal preferences.</p>
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
                disabled={updatePersonalSettingsMutation.isPending || updatePlatformSettingsMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button 
                onClick={settingsForm.handleSubmit(handleSaveSettings)}
                disabled={updatePersonalSettingsMutation.isPending || updatePlatformSettingsMutation.isPending}
                className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
              >
                {updatePersonalSettingsMutation.isPending || updatePlatformSettingsMutation.isPending ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
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
                  <SettingsIcon className="h-5 w-5 text-primary" /> Personal Appearance & Region
                </CardTitle>
                <CardDescription>Customize how the dashboard looks and your personal timezone.</CardDescription>
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

          {/* Platform Automation */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-border/50 shadow-sm overflow-hidden border-primary/20">
              <CardHeader className="bg-primary/5 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-primary" /> Global Automation Engine
                </CardTitle>
                <CardDescription>Platform-wide controls for the workflow execution engine.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <FormField control={settingsForm.control} name="automationEngineEnabled" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-background">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-semibold">Enable Automation Engine (Platform-wide)</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        If disabled, ALL user workflows will halt execution immediately. Use this for maintenance.
                      </div>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Platform System Config */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/10 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" /> System Configuration
                </CardTitle>
                <CardDescription>Read-only statuses for platform integrations.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm opacity-80">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Email Configuration (Brevo)</FormLabel>
                    <div className="text-sm text-muted-foreground">Status of the outgoing SMTP integration.</div>
                  </div>
                  <div className="text-sm font-semibold text-green-500 bg-green-500/10 px-3 py-1 rounded-full flex items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2" /> Connected
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
