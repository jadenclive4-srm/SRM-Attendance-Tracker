import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const { user, role } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />;
}
