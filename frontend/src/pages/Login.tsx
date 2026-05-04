import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { Building2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [empId, setEmpId] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId || !pwd) { toast.error("Please fill all fields"); return; }
    setLoading(true);
    setTimeout(() => {
      const isAdmin = empId.toLowerCase().startsWith("admin");
      login(isAdmin ? "admin" : "user");
      toast.success(`Welcome back${isAdmin ? ", Admin" : ""}`);
      nav(isAdmin ? "/admin" : "/dashboard");
    }, 500);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left brand */}
      <div className="hidden lg:flex relative bg-gradient-primary p-12 flex-col justify-between text-primary-foreground overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-white/15 grid place-items-center backdrop-blur">
            <Building2 className="h-6 w-6" />
          </div>
          <span className="font-bold text-xl">Attendly</span>
        </div>
        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Modern attendance,<br />built for teams.
          </h1>
          <p className="text-primary-foreground/85 max-w-md leading-relaxed">
            Track work modes, surface insights and keep your hybrid workforce aligned — all from one elegant workspace.
          </p>
          <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
            <ShieldCheck className="h-4 w-4" />
            Enterprise-grade · SOC 2 ready
          </div>
        </div>
        <div className="relative text-xs text-primary-foreground/70">
          © {new Date().getFullYear()} Attendly Inc.
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-2xl font-bold">Sign in to your workspace</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Use <code className="px-1.5 py-0.5 rounded bg-muted text-xs">admin</code> in Employee ID to preview admin.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="emp">Employee ID</Label>
              <Input id="emp" placeholder="EMP1024" value={empId} onChange={e => setEmpId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pwd">Password</Label>
                <button type="button" className="text-xs font-medium text-primary hover:underline"
                  onClick={() => toast("Reset link sent (demo)")}>Forgot password?</button>
              </div>
              <Input id="pwd" type="password" placeholder="••••••••" value={pwd} onChange={e => setPwd(e.target.value)} />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Signing in…" : "Login"}
            </Button>
          </form>
          <p className="text-sm text-center text-muted-foreground">
            New here? <Link to="/signup" className="text-primary font-semibold hover:underline">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
