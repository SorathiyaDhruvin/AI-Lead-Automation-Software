import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Camera,
  MapPin,
  Briefcase,
  Link as LinkIcon,
  Bell,
  Shield,
  Eye,
  EyeOff,
  UploadCloud,
  CheckCircle2,
  Calendar,
  Settings as SettingsIcon,
  X,
  Save,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { authService } from "@/services/auth";
import { supabase } from "@/services/supabase";
import { apiClient } from "@/services/api";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  language: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  address: z.string().optional(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  department: z.string().optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  linkedin: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  github: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  portfolio: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  twitter: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  theme: z.string().optional(),
  timezone: z.string().optional(),
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, userProfile, session } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const defaultAvatar = userProfile?.profile_image_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(defaultAvatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const firstName = userProfile?.first_name || "User";
  const lastName = userProfile?.last_name || "";

  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      if (!user?.id) return {};
      const { data, error } = await supabase.from("users").select().eq("id", user.id).single();
      if (error) {
        if (error.code === 'PGRST116') return {}; // Not found
        throw error;
      }
      return {
        firstName: data.first_name,
        lastName: data.last_name,
        username: data.username,
        email: data.email,
        phone: data.phone,
        dob: data.dob ? String(data.dob).substring(0, 10) : "",
        gender: data.gender,
        language: data.language,
        jobTitle: data.occupation,
        company: data.company,
        department: data.department,
        bio: data.bio,
        country: data.country,
        state: data.state,
        city: data.city,
        postalCode: data.postal_code,
        address: data.street_address,
        linkedin: data.linkedin,
        github: data.github,
        portfolio: data.portfolio,
        twitter: data.twitter,
        profileImageUrl: data.profile_image_url,
      };
    },
    enabled: !!user?.id
  });

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      phone: "",
      dob: "",
      gender: "Select gender",
      language: "en",
      country: "",
      state: "",
      city: "",
      postalCode: "",
      address: "",
      jobTitle: "",
      company: "",
      department: "",
      bio: "",
      linkedin: "",
      github: "",
      portfolio: "",
      twitter: "",
      theme: "system",
      timezone: "America/Los_Angeles",
      emailNotifications: true,
      smsNotifications: false,
    },
  });

  useEffect(() => {
    if (profileData) {
      profileForm.reset({
        firstName: profileData.firstName || "",
        lastName: profileData.lastName || "",
        username: profileData.username || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
        dob: profileData.dob ? new Date(profileData.dob).toISOString().split("T")[0] : "",
        gender: profileData.gender || "Select Gender",
        language: profileData.language || "en",
        country: profileData.country || "",
        state: profileData.state || "",
        city: profileData.city || "",
        postalCode: profileData.postalCode || "",
        address: profileData.address || "",
        jobTitle: profileData.jobTitle || "",
        company: profileData.company || "",
        department: profileData.department || "",
        bio: profileData.bio || "",
        linkedin: profileData.linkedin || "",
        github: profileData.github || "",
        portfolio: profileData.portfolio || "",
        twitter: profileData.twitter || "",
        theme: "system",
        timezone: "America/Los_Angeles",
        emailNotifications: true,
        smsNotifications: false,
      });
      if (profileData.profileImageUrl) {
        setAvatarUrl(profileData.profileImageUrl);
      } else if (user?.user_metadata?.avatar_url || user?.user_metadata?.picture) {
        setAvatarUrl(user.user_metadata.avatar_url || user.user_metadata.picture);
      }
    }
  }, [profileData, profileForm, user]);

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { isDirty: isProfileDirty } = profileForm.formState;

  // Prevent leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProfileDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isProfileDirty]);

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const profileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const updated = await apiClient.put("/profile", data);
      return updated;
    },
    onSuccess: (data) => {
      toast({ title: "Profile updated successfully", description: "Your changes have been saved." });
      profileForm.reset(profileForm.getValues()); // Reset dirty state
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: PasswordForm) => {
      if (session?.access_token) {
        // Use Supabase for password update
        const { error } = await supabase.auth.updateUser({ password: data.newPassword });
        if (error) throw error;
        return { message: "Password updated successfully" };
      }
      // Fallback for legacy auth
      return authService.updatePassword(data);
    },
    onSuccess: () => {
      toast({ title: "Password updated", description: "Your password has been successfully changed." });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update password", variant: "destructive" });
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleImageUpload(file);
    } else {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("photo", file);
      
      const updatedUser = await apiClient.patchForm<any>("/profile/photo", formData);
      
      if (updatedUser.profile_image_url) {
        setAvatarUrl(updatedUser.profile_image_url);
        toast({ title: "Image uploaded", description: "Your profile picture has been updated." });
      }
    } catch (err) {
      toast({ title: "Upload failed", description: "Could not upload profile picture.", variant: "destructive" });
    }
  };

  if (isLoading || isProfileLoading) {
    return (
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 w-full">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-8">
            <Skeleton className="h-[400px] rounded-xl" />
            <Skeleton className="h-[300px] rounded-xl" />
          </div>
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-[200px] rounded-xl" />
            <Skeleton className="h-[300px] rounded-xl" />
            <Skeleton className="h-[200px] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
         
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your personal information and preferences.</p>
        </div>
        <AnimatePresence>
          {isProfileDirty && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-3"
            >
              <Button 
                variant="outline" 
                onClick={() => profileForm.reset()}
                disabled={profileMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button 
                onClick={profileForm.handleSubmit((data) => profileMutation.mutate(data))}
                disabled={profileMutation.isPending}
                className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
              >
                {profileMutation.isPending ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" /> Save Changes
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Cards */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-border/50 shadow-sm overflow-hidden group">
              <div className="h-24 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b" />
              <CardContent className="pt-0 relative px-6 pb-6 text-center">
                <div 
                  className={`relative inline-block -mt-12 mb-4 rounded-full border-4 border-background bg-muted
                    ${isDragging ? 'ring-2 ring-primary ring-offset-2' : ''}
                  `}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="h-24 w-24 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span className="uppercase">{firstName?.[0]}{lastName?.[0]}</span>
                    )}
                  </div>
                  
                  {/* Hover Overlay */}
                  <div 
                    className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                  
                  {/* Status Badge */}
                  <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-background" title="Active" />
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
                    }}
                  />
                </div>

                <div className="space-y-2 mt-4 flex flex-col items-center">
                  <div className="flex gap-2 text-sm">
                    <span className="font-semibold text-muted-foreground">Name :</span>
                    <span className="font-bold text-foreground">
                      {profileData?.firstName || userProfile?.first_name || "User"} {profileData?.lastName || userProfile?.last_name || ""}
                    </span>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="font-semibold text-muted-foreground">Username :</span>
                    <span className="font-medium text-foreground">
                      {profileData?.username || ""}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5 mt-2">
                    <Briefcase className="h-3.5 w-3.5" /> 
                    {profileData?.jobTitle || "Role"} at {profileData?.company || "Company"}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Badge variant="secondary" className="bg-secondary/50 font-normal">
                    {user?.role === "admin" ? "Administrator" : "Member"}
                  </Badge>
                  <Badge variant="outline" className="font-normal border-border/50 text-muted-foreground">
                    Since {new Date((user as any)?.createdAt || (user as any)?.created_at || Date.now()).getFullYear()}
                  </Badge>
                </div>
                
                {avatarUrl && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-6 text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
                    onClick={() => {
                      setAvatarUrl(null);
                      profileForm.setValue("firstName", profileForm.getValues("firstName"), { shouldDirty: true });
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Remove Picture
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Change Password Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> Security
                </CardTitle>
                <CardDescription>Update your password</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit((data) => passwordMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Current Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input placeholder="Current Password" type={showCurrentPassword ? "text" : "password"} className="pr-10" {...field} />
                              <button 
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              >
                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input placeholder="New Password" type={showNewPassword ? "text" : "password"} className="pr-10" {...field} />
                              <button 
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                              >
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input placeholder="Confirm Password" type={showConfirmPassword ? "text" : "password"} className="pr-10" {...field} />
                              <button 
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={passwordMutation.isPending} className="w-full mt-2" variant="outline">
                      {passwordMutation.isPending ? "Updating..." : "Update Password"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Account Info (Read-only) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-border/50 shadow-sm bg-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                   Account Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">User ID</span>
                  <span className="font-mono text-xs">{user?.id?.substring(0, 8) || "user_123"}...</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Created</span>
                  <span>{new Date((userProfile as any)?.created_at || (user as any)?.created_at || Date.now()).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Email Status</span>
                  <span className="flex items-center text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">2FA Status</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-semibold text-muted-foreground">Disabled</Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column - Main Form */}
        <div className="lg:col-span-8 xl:col-span-9">
          <Form {...profileForm}>
            <form id="profile-form" className="space-y-6">
              
              {/* Personal Information */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="border-border/50 shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/10 border-b pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" /> Personal Information
                    </CardTitle>
                    <CardDescription>Update your basic personal details.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={profileForm.control} name="firstName" render={({ field }) => (
                        <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="First Name" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={profileForm.control} name="lastName" render={({ field }) => (
                        <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Last Name" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={profileForm.control} name="username" render={({ field }) => (
                        <FormItem><FormLabel>Username</FormLabel><FormControl><Input placeholder="Username" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={profileForm.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email Address</FormLabel><FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Email Address" type="email" {...field} /></div></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={profileForm.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Phone Number</FormLabel><FormControl><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Phone Number" type="tel" {...field} /></div></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={profileForm.control} name="dob" render={({ field }) => (
                        <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" type="date" {...field} /></div></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={profileForm.control} name="gender" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="Select Gender">Select Gender</SelectItem>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={profileForm.control} name="language" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Language</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="es">Spanish</SelectItem>
                              <SelectItem value="fr">French</SelectItem>
                              <SelectItem value="de">German</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Address Information */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <Card className="border-border/50 shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/10 border-b pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" /> Address Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={profileForm.control} name="country" render={({ field }) => (
                        <FormItem><FormLabel>Country</FormLabel><FormControl><Input placeholder="Country" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={profileForm.control} name="state" render={({ field }) => (
                        <FormItem><FormLabel>State / Province</FormLabel><FormControl><Input placeholder="State / Province" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={profileForm.control} name="city" render={({ field }) => (
                        <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="City" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={profileForm.control} name="postalCode" render={({ field }) => (
                        <FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input placeholder="Postal Code" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <div className="md:col-span-2">
                        <FormField control={profileForm.control} name="address" render={({ field }) => (
                          <FormItem><FormLabel>Full Address</FormLabel><FormControl><Textarea className="resize-none h-20" placeholder="Full Address" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Professional Information */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <Card className="border-border/50 shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/10 border-b pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" /> Professional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <FormField control={profileForm.control} name="jobTitle" render={({ field }) => (
                        <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input placeholder="Job Title" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={profileForm.control} name="company" render={({ field }) => (
                        <FormItem><FormLabel>Company</FormLabel><FormControl><Input placeholder="Company" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={profileForm.control} name="department" render={({ field }) => (
                        <FormItem><FormLabel>Department</FormLabel><FormControl><Input placeholder="Department" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={profileForm.control} name="bio" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio / About Me</FormLabel>
                        <FormControl><Textarea className="resize-none h-24" placeholder="Tell us a little bit about yourself..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Social Links */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                <Card className="border-border/50 shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/10 border-b pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <LinkIcon className="h-5 w-5 text-primary" /> Social Links
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={profileForm.control} name="linkedin" render={({ field }) => (
                        <FormItem><FormLabel>LinkedIn</FormLabel><FormControl><Input placeholder="https://linkedin.com/in/..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={profileForm.control} name="github" render={({ field }) => (
                        <FormItem><FormLabel>GitHub</FormLabel><FormControl><Input placeholder="https://github.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={profileForm.control} name="twitter" render={({ field }) => (
                        <FormItem><FormLabel>Twitter / X</FormLabel><FormControl><Input placeholder="https://twitter.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={profileForm.control} name="portfolio" render={({ field }) => (
                        <FormItem><FormLabel>Portfolio Website</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>



              {/* Bottom Action Bar (Mobile only, Desktop is sticky top) */}
              <div className="md:hidden pt-4 pb-12 flex justify-end gap-4 border-t">
                {isProfileDirty && (
                  <Button type="button" variant="outline" onClick={() => profileForm.reset()}>
                    Cancel
                  </Button>
                )}
                <Button 
                  type="button" 
                  onClick={profileForm.handleSubmit((data) => profileMutation.mutate(data))}
                  disabled={!isProfileDirty || profileMutation.isPending}
                  className="w-full"
                >
                  {profileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>

            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
