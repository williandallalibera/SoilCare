import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { RoleRoute } from "../auth/RoleRoute";
import { useEffect, useState } from "react";
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
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isSidebarCollapsed = !isDesktopSidebarOpen;

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

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsMobileSidebarOpen((current) => !current);
      return;
    }

    setIsDesktopSidebarOpen((current) => !current);
  };

  const renderSidebarContent = (collapsed: boolean) => (
    <>
      <div
        className={`border-b border-slate-800 flex items-center min-h-[89px] ${
          collapsed ? "justify-center px-3" : "gap-3 p-6"
        }`}
      >
        <img
          src={brandLogo}
          alt="Soil Care logo"
          className="h-12 w-12 rounded-xl bg-white/5 object-contain p-1"
        />
        {!collapsed && (
          <div className="min-w-0">
            <span className="block font-bold text-lg tracking-tight">Soil Care</span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-slate-400">
              {t("brand.tagline")}
            </span>
          </div>
        )}
      </div>

      <nav className="p-4 space-y-1">
        {filteredMenu.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/app" && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.label}
              className={`flex items-center rounded-xl transition-all ${
                collapsed ? "justify-center px-3 py-3" : "gap-3 px-4 py-3"
              } ${
                isActive
                  ? "bg-agro-primary text-white shadow-lg shadow-agro-primary/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <i className={`${item.icon} w-5 text-center`}></i>
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {isMobileSidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-slate-950/45 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900 text-white shadow-2xl transition-transform duration-300 md:hidden ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      <aside
        className={`hidden md:block bg-slate-900 text-white transition-all duration-300 shrink-0 overflow-hidden ${
          isSidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {renderSidebarContent(isSidebarCollapsed)}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
            >
              <i className="fas fa-bars"></i>
            </button>
            <div className="hidden min-w-0 sm:flex items-center gap-3">
              <img
                src={brandLogo}
                alt="Soil Care logo"
                className="h-10 w-10 rounded-lg object-contain"
              />
              <div className="min-w-0">
                <h2 className="font-semibold leading-tight text-gray-800">Soil Care</h2>
                <p className="truncate text-xs text-gray-500">{t("brand.tagline")}</p>
              </div>
            </div>
          </div>

          <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:gap-4">
            <LanguageSwitcher />
            <div className="mr-1 hidden min-w-0 flex-col items-end sm:flex">
              <span className="text-sm font-bold text-gray-900">
                {perfil?.nombre ?? t("common.user")}
              </span>
              <span className="truncate text-xs text-gray-500 capitalize">
                {perfil?.perfil_acceso
                  ? t(`common.role.${perfil.perfil_acceso}`)
                  : t("common.user")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={isSigningOut}
              className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 sm:px-4"
            >
              <i className={`fas ${isSigningOut ? "fa-spinner fa-spin" : "fa-sign-out-alt"}`}></i>
              <span className="hidden sm:inline">
                {isSigningOut ? t("layout.loggingOut") : t("layout.logout")}
              </span>
            </button>
          </div>
        </header>

        {/* Routes Container */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
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
