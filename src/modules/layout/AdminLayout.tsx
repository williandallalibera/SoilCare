import { Outlet, Routes, Route, Navigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { RoleRoute } from "../auth/RoleRoute";
import { AjustesPage } from "../ajustes/AjustesPage";
import { ProductosPage } from "../productos/ProductosPage";
import { CRMPage } from "../crm/CRMPage";
import { ParcelasPage } from "../parcelas/ParcelasPage";
import { MonitoreoPage } from "../monitoreo/MonitoreoPage";
import { AgenteIAPage } from "../agente-ia/AgenteIAPage";
import { EspacioClientePage } from "../espacio-cliente/EspacioClientePage";

function DashboardPage() {
  return (
    <section className="content">
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header bg-success text-white">
                <h3 className="card-title mb-0">Panel principal</h3>
              </div>
              <div className="card-body">
                <p>
                  Bienvenido al sistema de monitoreo agrícola Primesoft CBISA.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AdminLayout() {
  const { perfil, signOut } = useAuth();

  return (
    <div className="wrapper">
      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        <ul className="navbar-nav">
          <li className="nav-item">
            <a className="nav-link" data-widget="pushmenu" href="#">
              <i className="fas fa-bars" />
            </a>
          </li>
          <li className="nav-item d-none d-sm-inline-block">
            <span className="nav-link">Primesoft CBISA</span>
          </li>
        </ul>
        <ul className="navbar-nav ml-auto">
          <li className="nav-item dropdown user-menu">
            <a href="#" className="nav-link dropdown-toggle">
              <span className="d-none d-md-inline">
                {perfil?.nombre ?? "Usuario"}
              </span>
            </a>
          </li>
          <li className="nav-item">
            <button
              className="btn btn-outline-danger btn-sm ml-2"
              onClick={() => signOut()}
            >
              <i className="fas fa-sign-out-alt mr-1" />
              Salir
            </button>
          </li>
        </ul>
      </nav>

      <aside className="main-sidebar sidebar-dark-success elevation-4">
        <Link to="/app" className="brand-link text-center">
          <span className="brand-text font-weight-light">Primesoft CBISA</span>
        </Link>

        <div className="sidebar">
          <nav className="mt-2">
            <ul
              className="nav nav-pills nav-sidebar flex-column"
              role="menu"
              data-accordion="false"
            >
              {perfil?.perfil_acceso === "cliente" ? (
                <>
                  <li className="nav-item">
                    <Link to="/app/espacio-cliente" className="nav-link">
                      <i className="nav-icon fas fa-user-circle" />
                      <p>Espacio del Cliente</p>
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <Link to="/app" className="nav-link">
                      <i className="nav-icon fas fa-tachometer-alt" />
                      <p>Dashboard</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/app/ajustes" className="nav-link">
                      <i className="nav-icon fas fa-cogs" />
                      <p>Ajustes</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/app/productos" className="nav-link">
                      <i className="nav-icon fas fa-boxes" />
                      <p>Productos</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/app/crm" className="nav-link">
                      <i className="nav-icon fas fa-users" />
                      <p>CRM</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/app/parcelas" className="nav-link">
                      <i className="nav-icon fas fa-map" />
                      <p>Parcelas</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/app/monitoreo" className="nav-link">
                      <i className="nav-icon fas fa-seedling" />
                      <p>Monitoreo</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/app/agente-ia" className="nav-link">
                      <i className="nav-icon fas fa-robot" />
                      <p>Agente de IA</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/app/espacio-cliente" className="nav-link">
                      <i className="nav-icon fas fa-user-circle" />
                      <p>Espacio del Cliente</p>
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </div>
      </aside>

      <div className="content-wrapper" style={{ minHeight: "100vh" }}>
        <Routes>
          <Route
            index
            element={
              perfil?.perfil_acceso === "cliente" ? (
                <Navigate to="/app/espacio-cliente" replace />
              ) : (
                <DashboardPage />
              )
            }
          />

          <Route
            path="ajustes/*"
            element={
              <RoleRoute allowed={["admin"]}>
                <AjustesPage />
              </RoleRoute>
            }
          />

          <Route
            path="productos/*"
            element={
              <RoleRoute allowed={["admin", "rtv"]}>
                <ProductosPage />
              </RoleRoute>
            }
          />

          <Route
            path="crm/*"
            element={
              <RoleRoute allowed={["admin", "rtv"]}>
                <CRMPage />
              </RoleRoute>
            }
          />

          <Route
            path="parcelas/*"
            element={
              <RoleRoute allowed={["admin", "rtv"]}>
                <ParcelasPage />
              </RoleRoute>
            }
          />

          <Route
            path="monitoreo/*"
            element={
              <RoleRoute allowed={["admin", "rtv"]}>
                <MonitoreoPage />
              </RoleRoute>
            }
          />

          <Route
            path="agente-ia/*"
            element={
              <RoleRoute allowed={["admin"]}>
                <AgenteIAPage />
              </RoleRoute>
            }
          />

          <Route
            path="espacio-cliente/*"
            element={
              <RoleRoute allowed={["cliente", "admin", "rtv"]}>
                <EspacioClientePage />
              </RoleRoute>
            }
          />

          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
        <Outlet />
      </div>
    </div>
  );
}

function PlaceholderPage({ titulo }: { titulo: string }) {
  return (
    <section className="content">
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header bg-success text-white">
                <h3 className="card-title mb-0">{titulo}</h3>
              </div>
              <div className="card-body">
                <p>
                  Esta sección será implementada conforme al PRD de Primesoft
                  CBISA.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

