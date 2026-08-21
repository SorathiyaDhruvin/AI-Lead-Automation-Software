import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { AlertCircle, Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export default function VerifyOtp() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Extract email from query params
  const [email, setEmail] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
    } else {
      setLocation("/forgot-password");
    }
  }, [location, setLocation]);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [cooldown, setCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer for resend
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste in regular onChange if not caught by onPaste
      const pastedData = value.slice(0, 6).split("");
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) {
        if (index + i < 6 && /^[0-9]$/.test(pastedData[i])) {
          newOtp[index + i] = pastedData[i];
        }
      }
      setOtp(newOtp);
      const nextEmptyIndex = newOtp.findIndex(val => val === "");
      const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
      inputRefs.current[focusIndex]?.focus();
      return;
    }

    if (/^[0-9]?$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-advance
      if (value !== "" && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (otp[index] === "" && index > 0) {
        // Move to previous input on backspace if current is empty
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim().slice(0, 6).split("");
    const newOtp = [...otp];
    let focusIndex = 0;
    
    for (let i = 0; i < 6; i++) {
      if (pastedData[i] && /^[0-9]$/.test(pastedData[i])) {
        newOtp[i] = pastedData[i];
        focusIndex = i;
      }
    }
    
    setOtp(newOtp);
    if (focusIndex < 5 && newOtp[focusIndex] !== "") {
      inputRefs.current[focusIndex + 1]?.focus();
    } else {
      inputRefs.current[5]?.focus();
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    
    setIsResending(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Failed to resend code");
      }

      toast({
        title: "Code resent",
        description: "A new 6-digit code has been sent to your email",
      });
      setCooldown(60);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      const msg = error?.message || "Failed to resend code";
      setErrorMsg(msg);
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join("");
    if (otpValue.length < 6) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpValue }),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Invalid or expired code");
      }

      toast({
        title: "Verified",
        description: "Code verified successfully.",
      });
      setLocation(`/reset-password?token=${encodeURIComponent(result.resetToken)}`);
    } catch (error: any) {
      const msg = error?.message || "An unexpected error occurred";
      setErrorMsg(msg);
      toast({
        title: "Verification failed",
        description: msg,
        variant: "destructive",
      });
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
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
                <h2 className="text-slate-900 text-[24px] font-bold dark:text-slate-50 leading-tight">Check your email</h2>
                <p className="text-[15px] text-slate-500 mt-2 dark:text-slate-400">
                  We sent a 6-digit code to <span className="font-medium text-slate-900 dark:text-slate-200">{email}</span>
                </p>
              </div>

              {errorMsg && (
                <Alert variant="destructive" className="mb-4 bg-red-50 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-900">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-[14px]">{errorMsg}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={onSubmit} className="space-y-6 w-full">
                <div className="flex justify-between gap-2 sm:gap-3">
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      className="h-12 w-12 sm:h-14 sm:w-14 text-center text-xl font-semibold rounded-xl bg-slate-50/50 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:bg-blue-50/50 focus-visible:border-blue-500 dark:bg-neutral-800 dark:border-neutral-700 transition-colors"
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  className="w-full h-[40px] text-[14px] rounded-[8px] font-medium tracking-wide text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  disabled={isSubmitting || otp.join("").length < 6}
                >
                  {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
                  {isSubmitting ? "Verifying..." : "Verify Code"}
                </Button>
              </form>

              <div className="mt-6 text-center text-[14px]">
                <span className="text-slate-500 dark:text-slate-400">Didn't receive the code? </span>
                {cooldown > 0 ? (
                  <span className="text-slate-400 font-medium ml-1">Resend in {cooldown}s</span>
                ) : (
                  <button 
                    onClick={handleResend}
                    disabled={isResending}
                    className="text-blue-600 hover:underline font-medium dark:text-blue-400 ml-1 disabled:opacity-50"
                  >
                    Resend now
                  </button>
                )}
              </div>
              
              <div className="mt-4 text-center">
                <Link href="/forgot-password" className="text-slate-500 text-[14px] hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium inline-flex items-center gap-1.5 transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                  Back
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
            alt="verify-otp-image" 
          />
        </div>

      </div>
    </main>
  );
}
