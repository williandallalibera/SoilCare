import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { isLocalPreviewModeEnabled } from "./authMode";

interface Props {
  children: ReactNode;
}

export function PrivateRoute({ children }: Props) {
  const { session, perfil, loading } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const isReviewMode = isLocalPreviewModeEnabled();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <i className="fas fa-spinner fa-spin text-agro-primary text-3xl mb-3" />
          <p className="font-semibold text-gray-900">{t("privateRoute.loading")}</p>
        </div>
      </div>
    );
  }

  if ((!session || !perfil) && !isReviewMode) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (perfil?.estado === "inactivo") {
    return <Navigate to="/404" replace />;
  }

  return <>{children}</>;
}
