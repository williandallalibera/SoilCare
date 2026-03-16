import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { RoleRoute } from "../auth/RoleRoute";
import { useState } from "react";
import { DashboardPage } from "../dashboard/DashboardPage";
import { ClientesPage } from "../clientes/ClientesPage";
import { AreasPage } from "../areas/AreasPage";
import { AnalisesPage } from "../analises/AnalisesPage";
import { ParametrosPage } from "../parametros/ParametrosPage";
import { UsuariosPage } from "../usuarios/UsuariosPage";
import brandLogo from "../../assets/soil-care-brand.svg";
import { LanguageSwitcher } from "../i18n/LanguageSwitcher";
import { useI18n } from "../i18n/I18nContext";

export function AdminLayout() {
  const { perfil, signOut } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const menuItems = [
    { path: "/app", icon: "fas fa-gauge-high", label: t("layout.menu.dashboard"), roles: ["admin", "operador"] },
    { path: "/app/clientes", icon: "fas fa-users", label: t("layout.menu.clientes"), roles: ["admin", "operador"] },
    { path: "/app/areas", icon: "fas fa-draw-polygon", label: t("layout.menu.areas"), roles: ["admin", "operador"] },
    { path: "/app/analises", icon: "fas fa-vial-circle-check", label: t("layout.menu.analises"), roles: ["admin", "operador"] },
    { path: "/app/parametros", icon: "fas fa-sliders", label: t("layout.menu.parametros"), roles: ["admin"] },
    { path: "/app/usuarios", icon: "fas fa-user-shield", label: t("layout.menu.usuarios"), roles: ["admin"] },
  ];

  const filteredMenu = menuItems.filter((item) =>
    perfil?.perfil_acceso ? item.roles.includes(perfil.perfil_acceso) : false
  );

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`bg-slate-900 text-white w-64 flex-shrink-0 transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-64 absolute h-full ring-0'} z-50`}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <img
            src={brandLogo}
            alt="Soil Care logo"
            className="h-12 w-12 rounded-xl bg-white/5 object-contain p-1"
          />
          <div className="min-w-0">
            <span className="block font-bold text-lg tracking-tight">Soil Care</span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-slate-400">
              {t("brand.tagline")}
            </span>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {filteredMenu.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== "/app" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                  ? 'bg-agro-primary text-white shadow-lg shadow-agro-primary/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <i className={`${item.icon} w-5 text-center`}></i>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 h-16 flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
            >
              <i className="fas fa-bars"></i>
            </button>
            <div className="hidden md:flex items-center gap-3">
              <img
                src={brandLogo}
                alt="Soil Care logo"
                className="h-10 w-10 rounded-lg object-contain"
              />
              <div>
                <h2 className="font-semibold leading-tight text-gray-800">Soil Care</h2>
                <p className="text-xs text-gray-500">{t("brand.tagline")}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <div className="flex flex-col items-end mr-2">
              <span className="text-sm font-bold text-gray-900">
                {perfil?.nombre ?? t("common.user")}
              </span>
              <span className="text-xs text-gray-500 capitalize">
                {perfil?.perfil_acceso
                  ? t(`common.role.${perfil.perfil_acceso}`)
                  : t("common.user")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={isSigningOut}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
            >
              <i className={`fas ${isSigningOut ? "fa-spinner fa-spin" : "fa-sign-out-alt"}`}></i>
              <span className="hidden sm:inline">
                {isSigningOut ? t("layout.loggingOut") : t("layout.logout")}
              </span>
            </button>
          </div>
        </header>

        {/* Routes Container */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route
              index
              element={<DashboardPage />}
            />

            <Route
              path="clientes/*"
              element={
                <RoleRoute allowed={["admin", "operador"]}>
                  <ClientesPage />
                </RoleRoute>
              }
            />
            <Route
              path="areas/*"
              element={
                <RoleRoute allowed={["admin", "operador"]}>
                  <AreasPage />
                </RoleRoute>
              }
            />
            <Route
              path="analises/*"
              element={
                <RoleRoute allowed={["admin", "operador"]}>
                  <AnalisesPage />
                </RoleRoute>
              }
            />
            <Route
              path="parametros/*"
              element={
                <RoleRoute allowed={["admin"]}>
                  <ParametrosPage />
                </RoleRoute>
              }
            />
            <Route
              path="usuarios/*"
              element={
                <RoleRoute allowed={["admin"]}>
                  <UsuariosPage />
                </RoleRoute>
              }
            />

            <Route path="*" element={<DashboardPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
