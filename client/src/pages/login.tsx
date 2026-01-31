import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

const features = [
  "Smart lead scoring and qualification",
  "Automated email sequences",
  "Real-time analytics dashboard",
];

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast({ title: "Welcome back!", description: "Successfully logged in" });
      setTimeout(() => {
        setLocation("/dashboard");
      }, 100);
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Please check your credentials",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Brand Hero (Desktop Only) */}
      <div className="hidden md:flex md:w-[40%] bg-gradient-to-br from-primary via-primary/90 to-secondary relative overflow-hidden">
        {/* Abstract geometric decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute top-40 right-20 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute bottom-32 left-20 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute bottom-20 right-10 w-16 h-16 rounded-full bg-white/10" />
          <div className="absolute top-1/2 left-1/4 w-20 h-20 rounded-full bg-white/5" />
          {/* Dots pattern */}
          <div className="absolute top-1/4 right-1/4 grid grid-cols-4 gap-3 opacity-20">
            {[...Array(16)].map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-white" />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold">LeadFlow AI</span>
          </div>
          
          <h1 className="text-4xl lg:text-[2.5rem] font-bold leading-tight mb-4">
            AI Lead Automation
          </h1>
          <p className="text-lg text-white/80 mb-10 leading-relaxed max-w-md">
            Automate your lead generation and boost conversions with intelligent AI-powered workflows
          </p>

          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Check className="h-4 w-4 text-white" />
                </div>
                <span className="text-white/90">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 bg-background">
        <div className="w-full max-w-[440px]">
          {/* Mobile Logo */}
          <div className="flex md:hidden items-center justify-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">LeadFlow AI</span>
          </div>

          {/* Form Card */}
          <div className="bg-card rounded-2xl shadow-lg p-8 md:p-12 border">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">Get Started</h2>
              <p className="text-muted-foreground">Sign in to access your dashboard</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="you@company.com"
                            className="pl-11 rounded-lg"
                            data-testid="input-email"
                            {...field}
                          />
                        </div>
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
                      <FormLabel className="text-sm font-medium">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="pl-11 pr-11 rounded-lg"
                            data-testid="input-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-lg font-semibold"
                  disabled={isLoading}
                  data-testid="button-submit"
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  href="/register"
                  className="text-primary font-semibold underline-offset-4 hover:underline"
                  data-testid="link-register"
                >
                  Create account
                </Link>
              </p>
              <a
                href="#"
                className="block text-sm text-muted-foreground underline-offset-4 hover:underline"
                data-testid="link-forgot-password"
              >
                Forgot password?
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
