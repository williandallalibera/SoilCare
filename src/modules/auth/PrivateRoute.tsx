import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

interface Props {
  children: ReactNode;
}

export function PrivateRoute({ children }: Props) {
  const { session, perfil, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <span>Cargando...</span>
      </div>
    );
  }

  if (!session || !perfil) {
    return <Navigate to="/404" state={{ from: location }} replace />;
  }

  if (perfil.estado === "inactivo") {
    return <Navigate to="/404" replace />;
  }

  return <>{children}</>;
}

