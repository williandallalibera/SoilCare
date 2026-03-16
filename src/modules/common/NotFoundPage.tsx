import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";

export function NotFoundPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-10 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
          <i className="fas fa-triangle-exclamation text-2xl" />
        </div>
        <h1 className="text-5xl font-black text-gray-900 mt-6">404</h1>
        <h2 className="text-xl font-bold text-gray-900 mt-2">{t("notFound.title")}</h2>
        <p className="text-sm text-gray-500 mt-3">
          {t("notFound.body")}
        </p>
        <Link
          to="/app"
          className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-xl bg-agro-primary text-white text-sm font-bold shadow shadow-agro-primary/20"
        >
          <i className="fas fa-home" /> {t("notFound.back")}
        </Link>
      </div>
    </div>
  );
}
