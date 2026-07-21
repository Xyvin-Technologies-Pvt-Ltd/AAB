import { useState } from "react";
import { Link } from "react-router-dom";
import { useLogin } from "@/hooks/useAuth";
import { Button } from "@/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Eye, EyeOff, Loader2, ShieldCheck, Clock, LineChart } from "lucide-react";
import logoImg from "@/assets/Logo_1.png";

const highlights = [
  { icon: LineChart, label: "Real-time profitability tracking" },
  { icon: Clock, label: "Comprehensive time entry management" },
  { icon: ShieldCheck, label: "Advanced analytics and reporting" },
];

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const loginMutation = useLogin();

  const handleSubmit = (e) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side - Branding */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 lg:flex lg:w-1/2">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.12]" />
        <div className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="mb-8 flex items-center gap-3">
            <img
              src={logoImg}
              alt="Authentic Accounting"
              className="h-16 object-contain"
            />
          </div>
          <h1 className="mb-4 text-4xl font-bold leading-tight">
            Accounting Platform
          </h1>
          <p className="max-w-md text-lg text-emerald-50/90">
            Track profitability and manage your accounting operations efficiently.
          </p>

          <div className="mt-10 space-y-4">
            {highlights.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="text-emerald-50">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="relative flex w-full items-center justify-center p-6 sm:p-8 lg:w-1/2">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        <Card className="w-full max-w-md shadow-soft">
          <CardHeader className="space-y-1 text-center">
            <img
              src={logoImg}
              alt="Authentic Accounting"
              className="mx-auto mb-2 h-12 object-contain lg:hidden"
            />
            <CardTitle className="text-3xl font-bold tracking-tight">
              Welcome back
            </CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-transparent focus:ring-2 focus:ring-ring"
                  placeholder="Enter your email"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 pr-12 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-transparent focus:ring-2 focus:ring-ring"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary accent-primary focus:ring-ring"
                  />
                  <span className="text-sm text-muted-foreground">Remember me</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {loginMutation.isError && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                  <p className="text-sm text-destructive">
                    {loginMutation.error?.response?.data?.message ||
                      "Login failed. Please try again."}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full text-base"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
