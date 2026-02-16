import type { Role } from "../../types";
import { useAuth } from "../../hooks/useAuth";

interface RoleGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user } = useAuth();
  if (!user || !allowedRoles.includes(user.role)) return null;
  return <>{children}</>;
}
