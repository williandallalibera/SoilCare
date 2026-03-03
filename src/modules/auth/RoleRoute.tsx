import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

type PerfilAcceso = "admin" | "rtv" | "cliente";

interface Props {
  allowed: PerfilAcceso[];
  children: ReactNode;
}

export function RoleRoute({ allowed, children }: Props) {
  const { perfil } = useAuth();

  if (!perfil) {
    return <Navigate to="/404" replace />;
  }

  if (!allowed.includes(perfil.perfil_acceso)) {
    return <Navigate to="/404" replace />;
  }

  return <>{children}</>;
}

