import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { useAuth } from "./AuthContext";
import brandLogo from "../../assets/soil-care-brand.svg";
import { LanguageSwitcher } from "../i18n/LanguageSwitcher";
import { useI18n } from "../i18n/I18nContext";

export function LoginPage() {
  const { signIn } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) {
      setError(
        result.error === "Invalid login credentials"
          ? t("login.invalidCredentials")
          : result.error
      );
      return;
    }
    navigate("/app", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden">
      {/* Background Decorativo Agro Premium */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-agro-secondary/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[30rem] h-[30rem] bg-agro-primary/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden z-10 border border-gray-100">
        <div className="px-8 py-10">
          <div className="mb-6 flex justify-end">
            <LanguageSwitcher />
          </div>
          <div className="text-center mb-10">
            <img
              src={brandLogo}
              alt="Soil Care logo"
              className="mx-auto mb-5 h-40 w-40 object-contain drop-shadow-sm"
            />
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Soil Care</h1>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-agro-secondary mt-2">
              {t("brand.tagline")}
            </p>
            <p className="text-gray-500 mt-3 font-medium">{t("login.subtitle")}</p>
          </div>

          {!isSupabaseConfigured && (
            <div className="mb-6 p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-sm flex gap-3 shadow-sm">
              <i className="fas fa-exclamation-triangle mt-0.5 text-orange-500"></i>
              <div>
                <strong className="block font-semibold mb-1">{t("login.pendingConfig.title")}</strong>
                <p>{t("login.pendingConfig.body")} <code className="bg-orange-100 px-1 py-0.5 rounded text-orange-900">VITE_SUPABASE_URL</code> e <code className="bg-orange-100 px-1 py-0.5 rounded text-orange-900">VITE_SUPABASE_ANON_KEY</code>.</p>
                <p className="mt-2">{t("login.pendingConfig.hint")}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex gap-3 items-center shadow-sm">
              <i className="fas fa-times-circle text-red-500 text-lg"></i>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="email">
                {t("login.email")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <i className="fas fa-envelope"></i>
                </div>
                <input
                  id="email"
                  type="email"
                  className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-gray-900 focus:ring-2 focus:ring-agro-primary/30 focus:border-agro-primary transition-all shadow-sm"
                  placeholder={t("login.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="password">
                {t("login.password")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <i className="fas fa-lock"></i>
                </div>
                <input
                  id="password"
                  type="password"
                  className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-gray-900 focus:ring-2 focus:ring-agro-primary/30 focus:border-agro-primary transition-all shadow-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end mt-2">
                <span className="text-sm font-medium text-agro-secondary">
                  {t("login.requestPassword")}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-agro-primary hover:bg-agro-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-agro-primary transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <i className="fas fa-circle-notch fa-spin"></i>
                  {t("login.submitting")}
                </>
              ) : (
                t("login.submit")
              )}
            </button>
          </form>
        </div>
        <div className="bg-gray-50 px-8 py-5 text-center text-xs text-gray-500 font-medium border-t border-gray-100">
          © {new Date().getFullYear()} Soil Care
        </div>
      </div>
    </div>
  );
}
