import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/services/supabase";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      setLocation("/dashboard");
    } else if (!user) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [user, loading, setLocation]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    const errorDescription = params.get("error_description");
    if (errorParam || errorDescription) {
      const msg = errorDescription || `Authentication error: ${errorParam}`;
      setErrorMsg(msg);
      toast({
        title: "Login Error",
        description: msg,
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/login");
    }
  }, [toast]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "Successfully logged in",
      });
    } catch (error: any) {
      const msg = error?.message || "Invalid login credentials";
      setErrorMsg(msg);
      toast({
        title: "Login failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth-callback`
      }
    });
  };

  return (
    <main className="bg-slate-50 md:h-screen dark:bg-neutral-950 w-full overflow-hidden font-sans">
      <div className="grid md:auth-layout-grid items-center w-full h-full gap-8 md:gap-16 lg:gap-20">

        {/* Right - Form (Flipped order for Desktop) */}
        <div className="flex flex-col items-center justify-center w-full h-full max-md:order-2 md:order-2 overflow-y-auto py-8">

          <div className="w-full max-w-[460px] px-4 md:px-0 flex flex-col items-center">
            {/* Logo Section (Outside Box) */}
            <div className="flex items-center gap-3 mb-6 ml-2 mr-auto">
              <div className="h-10 w-10 flex items-center justify-center">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
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
                <h2 className="text-slate-900 text-[24px] font-bold dark:text-slate-50 leading-tight">Welcome back</h2>
                <p className="text-[15px] text-slate-500 mt-2 dark:text-slate-400">Enter your information to access your account</p>
              </div>

              {errorMsg && (
                <Alert variant="destructive" className="mb-4 bg-red-50 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-900">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-[14px]">{errorMsg}</AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 w-full">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[14px] text-slate-700 dark:text-slate-200 font-medium">Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="xyz@example.com"
                            className="h-[40px] px-3 text-[14px] text-slate-900 rounded-[8px] bg-slate-50/50 w-full border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:bg-blue-50/50 focus-visible:border-blue-500 dark:text-slate-50 dark:bg-neutral-800 dark:border-neutral-700 transition-colors"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[14px] text-slate-700 dark:text-slate-200 font-medium">Password</FormLabel>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Link href="/forgot-password" className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-500">
                      Forgot Password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-full mt-2 h-[40px] text-[14px] rounded-[8px] font-medium tracking-wide text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
                    {isSubmitting ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
              </Form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-neutral-800" />
                </div>
                <div className="relative flex justify-center text-[12px] uppercase">
                  <span className="bg-white dark:bg-neutral-900 px-4 text-slate-400 font-medium">OR</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                className="w-full h-[40px] text-[14px] rounded-[8px] font-medium border-slate-200 bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-3 shadow-sm dark:bg-neutral-900 dark:border-neutral-700 dark:text-slate-200 dark:hover:bg-neutral-800 transition-all"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                  <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                    <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                    <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                    <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                  </g>
                </svg>
                Continue with Google
              </Button>

              <div className="mt-6 text-slate-500 text-[14px] text-center dark:text-slate-400">
                Don't have an account?{" "}
                <Link href="/register" className="text-blue-600 hover:underline font-medium dark:text-blue-400">
                  Sign up
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Left - Image */}
        <div className="hidden md:flex h-full max-md:order-1 md:order-1 items-center justify-center bg-white dark:bg-neutral-900 border-r border-slate-200 dark:border-neutral-800 p-8 lg:p-16">
          <img
            src="https://readymadeui.com/signin-image.webp"
            className="w-full max-w-[540px] xl:max-w-[600px] max-h-[80vh] h-auto object-contain block mx-auto filter hue-rotate-[45deg] saturate-[1.2]"
            alt="login-image"
          />
        </div>

      </div>
    </main>
  );
}
