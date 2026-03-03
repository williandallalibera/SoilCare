import { useState } from "react";
import { MonitoreoTab } from "./MonitoreoTab";
import { SiembraTab } from "./SiembraTab";
import { AplicacionesTab } from "./AplicacionesTab";
import { EvaluacionesTab } from "./EvaluacionesTab";
import { CosechasTab } from "./CosechasTab";

type TabKey = "monitoreo" | "siembra" | "aplicaciones" | "evaluaciones" | "cosechas";

export function MonitoreoPage() {
  const [tab, setTab] = useState<TabKey>("monitoreo");

  return (
    <section className="content">
      <div className="container-fluid">
        <div className="card">
          <div className="card-header bg-success text-white">
            <h3 className="card-title mb-0">Monitoreo</h3>
          </div>
          <div className="card-body">
            <ul className="nav nav-tabs" role="tablist">
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === "monitoreo" ? "active" : ""}`}
                  onClick={() => setTab("monitoreo")}
                  type="button"
                >
                  Monitoreo
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === "siembra" ? "active" : ""}`}
                  onClick={() => setTab("siembra")}
                  type="button"
                >
                  Siembra
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === "aplicaciones" ? "active" : ""}`}
                  onClick={() => setTab("aplicaciones")}
                  type="button"
                >
                  Aplicaciones
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === "evaluaciones" ? "active" : ""}`}
                  onClick={() => setTab("evaluaciones")}
                  type="button"
                >
                  Evaluaciones
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === "cosechas" ? "active" : ""}`}
                  onClick={() => setTab("cosechas")}
                  type="button"
                >
                  Cosechas
                </button>
              </li>
            </ul>
            <div className="mt-3">
              {tab === "monitoreo" && <MonitoreoTab />}
              {tab === "siembra" && <SiembraTab />}
              {tab === "aplicaciones" && <AplicacionesTab />}
              {tab === "evaluaciones" && <EvaluacionesTab />}
              {tab === "cosechas" && <CosechasTab />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
