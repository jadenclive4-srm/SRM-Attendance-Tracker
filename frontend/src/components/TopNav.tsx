import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Building2, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import NotificationsBell from "./NotificationsBell";

export default function TopNav() {
  const { user, role, logout } = useAuth();
  const nav = useNavigate();

  const links = role === "admin"
    ? [{ to: "/admin", label: "Home" }, { to: "/admin/monitor", label: "Monitor" }]
    : [{ to: "/dashboard", label: "Home" }, { to: "/timesheets", label: "Timesheets" }];

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to={role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-elevated">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-[15px]">Attendly</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {role === "admin" ? "Admin Console" : "Workspace"}
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 bg-muted/60 rounded-full p-1">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end
              className={({ isActive }) =>
                `px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  isActive ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`
              }>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1">
        <NotificationsBell />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full pr-3 pl-1 py-1 hover:bg-muted transition-colors">
            <div className="h-8 w-8 rounded-full grid place-items-center text-xs font-bold text-white"
              style={{ background: user?.avatarColor }}>
              {user?.fullName.split(" ").map(n => n[0]).slice(0,2).join("")}
            </div>
            <div className="hidden sm:flex flex-col leading-tight items-start">
              <span className="text-xs font-semibold">{user?.fullName}</span>
              <span className="text-[10px] text-muted-foreground">{user?.employeeId}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {role === "user" && (
              <DropdownMenuItem onClick={() => nav("/profile")}>
                <UserIcon className="h-4 w-4 mr-2" /> View Profile
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => { logout(); toast.success("Signed out"); nav("/login"); }}>
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
