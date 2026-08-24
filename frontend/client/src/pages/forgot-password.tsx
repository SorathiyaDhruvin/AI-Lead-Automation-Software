import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/services/supabase";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const { data: responseData, error: functionError } = await supabase.functions.invoke(
        'send-password-reset-email',
        {
          body: { email: data.email }
        }
      );

      if (functionError) {
        throw new Error(functionError.message || "Failed to call edge function");
      }

      if (!responseData?.success) {
        throw new Error(responseData?.message || "Unable to send password reset email.");
      }

      toast({
        title: "Code sent",
        description: "We've sent a 6-digit code to your email",
      });
      setLocation(`/verify-otp?email=${encodeURIComponent(data.email)}`);
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
          <div className="w-full max-w-[460px] px-4 md:px-0 flex flex-col items-center">
            
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
                <h2 className="text-slate-900 text-[24px] font-bold dark:text-slate-50 leading-tight">Forgot Password</h2>
                <p className="text-[15px] text-slate-500 mt-2 dark:text-slate-400">Enter your email address and we'll send you a 6-digit verification code.</p>
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

                  <Button
                    type="submit"
                    className="w-full h-[40px] text-[14px] rounded-[8px] font-medium tracking-wide text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
                    {isSubmitting ? "Sending code..." : "Send OTP"}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center">
                <Link href="/login" className="text-slate-500 text-[14px] hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium inline-flex items-center gap-1.5 transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
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
            alt="forgot-password-image" 
          />
        </div>

      </div>
    </main>
  );
}
