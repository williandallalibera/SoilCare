import { useState } from "react";
import { EmpresaTab } from "./EmpresaTab";
import { CbotTab } from "./CbotTab";
import { UsuariosTab } from "./UsuariosTab";
import { IntegracionesTab } from "./IntegracionesTab";

type TabKey = "empresa" | "cbot" | "usuarios" | "integraciones";

export function AjustesPage() {
  const [tab, setTab] = useState<TabKey>("empresa");

  return (
    <section className="content">
      <div className="container-fluid">
        <div className="card">
          <div className="card-header bg-success text-white">
            <h3 className="card-title mb-0">Ajustes</h3>
          </div>
          <div className="card-body">
            <ul className="nav nav-tabs" role="tablist">
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === "empresa" ? "active" : ""}`}
                  onClick={() => setTab("empresa")}
                  type="button"
                >
                  Empresa
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === "cbot" ? "active" : ""}`}
                  onClick={() => setTab("cbot")}
                  type="button"
                >
                  CBOT
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === "usuarios" ? "active" : ""}`}
                  onClick={() => setTab("usuarios")}
                  type="button"
                >
                  Usuarios
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${
                    tab === "integraciones" ? "active" : ""
                  }`}
                  onClick={() => setTab("integraciones")}
                  type="button"
                >
                  Integraciones
                </button>
              </li>
            </ul>
            <div className="mt-3">
              {tab === "empresa" && <EmpresaTab />}
              {tab === "cbot" && <CbotTab />}
              {tab === "usuarios" && <UsuariosTab />}
              {tab === "integraciones" && <IntegracionesTab />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

