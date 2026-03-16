import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { isLocalPreviewModeEnabled } from "./authMode";

type PerfilAcceso = "admin" | "operador";

interface Props {
  allowed: PerfilAcceso[];
  children: ReactNode;
}

export function RoleRoute({ allowed, children }: Props) {
  const { perfil, loading } = useAuth();
  const { t } = useI18n();
  const isForced = isLocalPreviewModeEnabled();

  if (loading && !isForced) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-4">
        <i className="fas fa-spinner fa-spin text-agro-primary text-3xl"></i>
        <div className="text-center">
          <p className="text-gray-900 font-bold">{t("roleRoute.loadingTitle")}</p>
          <p className="text-gray-500 text-sm">{t("roleRoute.loadingHint")}</p>
        </div>
      </div>
    );
  }

  if (!perfil && !isForced) {
    return <Navigate to="/login" replace />;
  }

  const hasPermission = perfil?.perfil_acceso && allowed.includes(perfil.perfil_acceso);
  if (isForced || hasPermission) {
    return <>{children}</>;
  }

  return <Navigate to="/404" replace />;
}
