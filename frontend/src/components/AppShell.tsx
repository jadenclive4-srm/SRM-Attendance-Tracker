import { ReactNode } from "react";
import TopNav from "./TopNav";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-soft">
      <TopNav />
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
