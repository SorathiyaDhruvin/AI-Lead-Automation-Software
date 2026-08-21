import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, AlertCircle, Loader2, CheckCircle2, Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/services/supabase";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success states
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
    mode: "onChange"
  });

  const watchPassword = form.watch("password", "");

  // Password strength checks
  const hasMinLength = watchPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(watchPassword);
  const hasNumber = /[0-9]/.test(watchPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(watchPassword);

  const strengthScore = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
  let strengthLabel = "Weak";
  let strengthColor = "bg-red-500";

  if (strengthScore === 4) {
    strengthLabel = "Strong";
    strengthColor = "bg-green-500";
  } else if (strengthScore >= 2) {
    strengthLabel = "Medium";
    strengthColor = "bg-yellow-500";
  }

  useEffect(() => {
    if (!loading && user) {
      setLocation("/dashboard");
    } else if (!user) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [user, loading, setLocation]);

  const onSubmit = async (data: RegisterForm) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const isAdmin = data.email.trim().toLowerCase() === "sorathiyadhruvin2005@gmail.com";
      const role = isAdmin ? "admin" : "user";

      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
            role: role,
          },
        },
      });

      if (error) throw error;

      setRegisteredEmail(data.email);
      setIsSuccess(true);

      // Auto redirect after 5 seconds if we wanted, but we'll show the verification screen
      // setTimeout(() => setLocation("/login"), 5000);

    } catch (error: any) {
      setErrorMsg(error?.message || "Failed to create account");
      toast({
        title: "Registration failed",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="bg-slate-50 min-h-screen md:h-screen dark:bg-neutral-950 w-full overflow-hidden font-sans">
      <div className="grid md:auth-layout-grid items-center w-full h-full gap-6 md:gap-10 lg:gap-14">

        {/* Left - Image */}
        <div className="hidden md:flex h-full max-md:order-1 md:order-1 items-center justify-center bg-white dark:bg-neutral-900 border-r border-slate-200 dark:border-neutral-800 p-8 lg:p-14">
          <img
            src="/signup-simple.png"
            className="w-full max-w-[520px] xl:max-w-[580px] max-h-[80vh] h-auto object-contain block mx-auto filter hue-rotate-[45deg] saturate-[1.2]"
            alt="signup-image"
          />
        </div>

        {/* Right - Form */}
        <div className="flex flex-col items-center justify-center w-full h-full max-md:order-2 md:order-2 overflow-y-auto py-4 sm:py-6">

          <div className="w-full max-w-[570px] px-4 sm:px-1 flex flex-col">

            {/* Logo Section (Outside Box) */}
            <div className="flex items-center gap-2.5 mb-3.5 ml-1 mr-auto">
              <div className="h-10 w-10 flex items-center justify-center">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-[24px] font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                  LeadFlow <span className="text-blue-600 dark:text-blue-400">AI</span>
                </h1>
                <span className="text-[12.5px] text-slate-500 font-medium tracking-wide mt-0.5">Lead Automation Platform</span>
              </div>
            </div>

            {/* Card Section */}
            <div className="w-full bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-slate-200 dark:border-neutral-800 p-6 sm:p-7 text-left">
              {isSuccess ? (
                <div className="flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500 py-4">
                  <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-500" />
                  </div>
                  <h2 className="text-slate-900 text-[22px] font-bold dark:text-slate-50 leading-tight mb-3">
                    Account Created Successfully
                  </h2>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl w-full mb-5">
                    <h3 className="text-[15px] font-semibold text-blue-900 dark:text-blue-200 mb-1">Verify your email</h3>
                    <p className="text-[13.5px] text-blue-700/80 dark:text-blue-300">
                      We've sent a verification link to<br />
                      <span className="font-semibold text-blue-800 dark:text-blue-100">{registeredEmail}</span>
                    </p>
                  </div>
                  <Button
                    onClick={() => setLocation("/login")}
                    className="w-full h-[42px] text-[15px] rounded-[8px]"
                  >
                    Return to Login
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <h2 className="text-slate-900 text-[22px] font-bold dark:text-slate-50 leading-tight">Create an account</h2>
                    <p className="text-[13.5px] text-slate-500 mt-0.5 dark:text-slate-400">Sign up to get started with your automation</p>
                  </div>

                  {errorMsg && (
                    <Alert variant="destructive" className="mb-3.5 py-2 px-3 bg-red-50 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-900">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-[13px]">{errorMsg}</AlertDescription>
                    </Alert>
                  )}

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 w-full">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[13.5px] text-slate-700 dark:text-slate-200 font-medium">Full Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="John Doe"
                                className="h-[40px] px-3.5 text-[14px] text-slate-900 rounded-[7px] bg-slate-50/50 w-full border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:bg-blue-50/50 focus-visible:border-blue-500 dark:text-slate-50 dark:bg-neutral-800 dark:border-neutral-700 transition-colors"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-[12px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[13.5px] text-slate-700 dark:text-slate-200 font-medium">Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="xyz@example.com"
                                className="h-[40px] px-3.5 text-[14px] text-slate-900 rounded-[7px] bg-slate-50/50 w-full border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:bg-blue-50/50 focus-visible:border-blue-500 dark:text-slate-50 dark:bg-neutral-800 dark:border-neutral-700 transition-colors"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-[12px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[13.5px] text-slate-700 dark:text-slate-200 font-medium">Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••••••"
                                  className="h-[40px] px-3.5 text-[14px] text-slate-900 rounded-[7px] bg-slate-50/50 w-full border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:bg-blue-50/50 focus-visible:border-blue-500 dark:text-slate-50 dark:bg-neutral-800 dark:border-neutral-700 pr-10 transition-colors"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                                </button>
                              </div>
                            </FormControl>

                            {/* Password Strength Indicator */}
                            {watchPassword.length > 0 && (
                              <div className="pt-1">
                                <div className="flex justify-between items-center mb-1 text-[11.5px]">
                                  <span className="font-medium text-slate-500 dark:text-slate-400">Password Strength</span>
                                  <span className={`font-semibold ${strengthColor.replace('bg-', 'text-')}`}>{strengthLabel}</span>
                                </div>
                                <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full mb-1.5">
                                  <div className={`rounded-full ${strengthScore >= 1 ? strengthColor : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                  <div className={`rounded-full ${strengthScore >= 2 ? strengthColor : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                  <div className={`rounded-full ${strengthScore >= 3 ? strengthColor : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                  <div className={`rounded-full ${strengthScore >= 4 ? strengthColor : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11.5px]">
                                  <div className={`flex items-center gap-1 ${hasMinLength ? 'text-green-600 font-medium' : 'text-slate-400'}`}>
                                    {hasMinLength ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} 8+ characters
                                  </div>
                                  <div className={`flex items-center gap-1 ${hasUppercase ? 'text-green-600 font-medium' : 'text-slate-400'}`}>
                                    {hasUppercase ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} Uppercase
                                  </div>
                                  <div className={`flex items-center gap-1 ${hasNumber ? 'text-green-600 font-medium' : 'text-slate-400'}`}>
                                    {hasNumber ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} Number
                                  </div>
                                  <div className={`flex items-center gap-1 ${hasSpecial ? 'text-green-600 font-medium' : 'text-slate-400'}`}>
                                    {hasSpecial ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} Special character
                                  </div>
                                </div>
                              </div>
                            )}
                            <FormMessage className="text-[12px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[13.5px] text-slate-700 dark:text-slate-200 font-medium">Confirm password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="••••••••••••"
                                  className="h-[40px] px-3.5 text-[14px] text-slate-900 rounded-[7px] bg-slate-50/50 w-full border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:bg-blue-50/50 focus-visible:border-blue-500 dark:text-slate-50 dark:bg-neutral-800 dark:border-neutral-700 pr-10 transition-colors"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                  {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage className="text-[12px]" />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full mt-2 h-[42px] text-[14.5px] rounded-[7px] font-medium tracking-wide text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-sm"
                        disabled={isSubmitting}
                      >
                        {isSubmitting && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
                        {isSubmitting ? "Creating account..." : "Sign up"}
                      </Button>
                    </form>
                  </Form>

                  <div className="mt-4 text-slate-500 text-[14px] text-center dark:text-slate-400">
                    Already have an account?{" "}
                    <Link href="/login" className="text-blue-600 hover:underline font-semibold dark:text-blue-400">
                      Sign in
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
