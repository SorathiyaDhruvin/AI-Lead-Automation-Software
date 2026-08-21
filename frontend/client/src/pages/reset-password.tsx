import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, AlertCircle, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/api";

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [token, setToken] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setLocation("/login");
    }
  }, [location, setLocation]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const passwordValue = form.watch("password");

  // Calculate password strength
  const calculateStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length >= 8) score += 1;
    if (pass.match(/[a-z]/) && pass.match(/[A-Z]/)) score += 1;
    if (pass.match(/\d/)) score += 1;
    if (pass.match(/[^a-zA-Z\d]/)) score += 1;
    return score;
  };
  
  const strengthScore = calculateStrength(passwordValue);

  const getStrengthColor = (score: number) => {
    if (score === 0) return "bg-slate-200 dark:bg-neutral-800";
    if (score === 1) return "bg-red-500";
    if (score === 2) return "bg-yellow-500";
    if (score === 3) return "bg-blue-500";
    return "bg-green-500";
  };

  const onSubmit = async (data: ResetPasswordForm) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await apiClient.post<{ message: string }>("/auth/reset-password", {
        token,
        newPassword: data.password
      });

      toast({
        title: "Success",
        description: "Your password has been reset successfully. Please log in.",
      });
      setLocation("/login");
    } catch (error: any) {
      const msg = error?.message || "An unexpected error occurred";
      setErrorMsg(msg);
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="bg-slate-50 md:h-screen dark:bg-neutral-950 w-full overflow-hidden font-sans">
      <div className="grid md:grid-cols-[11fr_9fr] items-center w-full h-full gap-8 md:gap-16 lg:gap-20">
        
        {/* Left - Form */}
        <div className="flex flex-col items-center justify-center w-full h-full max-md:order-2 md:order-1 overflow-y-auto py-8">
          <div className="w-full max-w-[480px] px-4 md:px-0 flex flex-col items-center">
            
            {/* Logo Section */}
            <div className="flex items-center gap-3 mb-6 ml-2 mr-auto">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                  LeadFlow <span className="text-blue-600 dark:text-blue-400">AI</span>
                </h1>
                <span className="text-[14px] text-slate-500 font-medium tracking-wide mt-1">Lead Automation Platform</span>
              </div>
            </div>

            {/* Card Section */}
            <div className="w-full bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-slate-200 dark:border-neutral-800 p-6 sm:p-8 text-left">
              <div className="mb-6">
                <h2 className="text-slate-900 text-[24px] font-bold dark:text-slate-50 leading-tight">Create new password</h2>
                <p className="text-[15px] text-slate-500 mt-2 dark:text-slate-400">Your new password must be different from previous used passwords.</p>
              </div>

              {errorMsg && (
                <Alert variant="destructive" className="mb-4 bg-red-50 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-900">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-[14px]">{errorMsg}</AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[14px] text-slate-700 dark:text-slate-200 font-medium">New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••••••"
                              className="h-[40px] px-3 text-[14px] text-slate-900 rounded-[8px] bg-slate-50/50 w-full border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:bg-blue-50/50 focus-visible:border-blue-500 dark:text-slate-50 dark:bg-neutral-800 dark:border-neutral-700 pr-12 transition-colors"
                              {...field}
                            />
                            <button
                              type="button"
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </FormControl>
                        
                        {/* Password Strength Meter */}
                        {passwordValue.length > 0 && (
                          <div className="mt-2.5">
                            <div className="flex gap-1.5 mb-1.5">
                              {[1, 2, 3, 4].map((level) => (
                                <div
                                  key={level}
                                  className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                                    strengthScore >= level ? getStrengthColor(strengthScore) : "bg-slate-200 dark:bg-neutral-800"
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400">
                              {strengthScore === 0 && "Very weak"}
                              {strengthScore === 1 && "Weak - add letters/numbers"}
                              {strengthScore === 2 && "Fair - add special characters"}
                              {strengthScore === 3 && "Good password"}
                              {strengthScore === 4 && "Strong password"}
                            </p>
                          </div>
                        )}
                        
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[14px] text-slate-700 dark:text-slate-200 font-medium">Confirm New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="••••••••••••"
                              className="h-[40px] px-3 text-[14px] text-slate-900 rounded-[8px] bg-slate-50/50 w-full border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:bg-blue-50/50 focus-visible:border-blue-500 dark:text-slate-50 dark:bg-neutral-800 dark:border-neutral-700 pr-12 transition-colors"
                              {...field}
                            />
                            <button
                              type="button"
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full mt-2 h-[40px] text-[14px] rounded-[8px] font-medium tracking-wide text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
                    {isSubmitting ? "Resetting..." : "Reset Password"}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center">
                <Link href="/login" className="text-slate-500 text-[14px] hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium inline-flex items-center gap-1.5 transition-colors">
                  Return to sign in
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Image */}
        <div className="hidden md:flex h-full max-md:order-1 md:order-2 items-center justify-center bg-white dark:bg-neutral-900 border-l border-slate-200 dark:border-neutral-800 p-8 lg:p-16">
          <img 
            src="https://readymadeui.com/signin-image.webp"
            className="w-full max-w-[540px] xl:max-w-[600px] max-h-[80vh] h-auto object-contain block mx-auto filter hue-rotate-[45deg] saturate-[1.2]" 
            alt="reset-password-image" 
          />
        </div>

      </div>
    </main>
  );
}
