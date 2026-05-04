import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DESIGNATIONS } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Building2, Info } from "lucide-react";

const COUNTRY_CODES = ["+91","+1","+44","+61","+65","+971"];

export default function Signup() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    fullName: "", empId: "", designation: "", team: "",
    email: "", cc: "+91", phone: "",
    city: "", state: "", country: "India", pincode: "",
    password: "", confirm: "",
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.empId || !form.email || !form.password) {
      toast.error("Please complete the required fields");
      return;
    }
    if (form.password !== form.confirm) { toast.error("Passwords do not match"); return; }
    login("user");
    toast.success("Account created");
    nav("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-soft py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="flex items-center gap-2.5 mb-8 w-fit">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary grid place-items-center">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">Attendly</span>
        </Link>

        <div className="card-soft p-8 sm:p-10">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1">Start tracking your work modes in minutes.</p>
          </div>

          <form onSubmit={submit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Full Name" required>
                <Input value={form.fullName} onChange={e => set("fullName", e.target.value)} placeholder="Jane Doe" />
              </Field>
              <Field label="Employee ID" required hint="Validated server-side via backend API">
                <Input value={form.empId} onChange={e => set("empId", e.target.value)} placeholder="EMP1024" />
              </Field>
              <Field label="Designation" required>
                <Select value={form.designation} onValueChange={v => set("designation", v)}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {DESIGNATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Team">
                <Input value={form.team} onChange={e => set("team", e.target.value)} placeholder="Platform" />
              </Field>
              <Field label="Email" required>
                <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="jane@acme.com" />
              </Field>
              <Field label="Phone Number">
                <div className="flex gap-2">
                  <Select value={form.cc} onValueChange={v => set("cc", v)}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRY_CODES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className="flex-1" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="98765 43210" />
                </div>
              </Field>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Address</h3>
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="City"><Input value={form.city} onChange={e => set("city", e.target.value)} /></Field>
                <Field label="State"><Input value={form.state} onChange={e => set("state", e.target.value)} /></Field>
                <Field label="Country"><Input value={form.country} onChange={e => set("country", e.target.value)} /></Field>
                <Field label="Pincode"><Input value={form.pincode} onChange={e => set("pincode", e.target.value)} /></Field>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Password" required>
                <Input type="password" value={form.password} onChange={e => set("password", e.target.value)} />
              </Field>
              <Field label="Confirm Password" required>
                <Input type="password" value={form.confirm} onChange={e => set("confirm", e.target.value)} />
              </Field>
            </div>

            <Button type="submit" className="w-full h-11">Create Account</Button>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" /> {hint}
        </p>
      )}
    </div>
  );
}
