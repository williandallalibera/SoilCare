import { useState } from "react";
import { ClientesTab } from "./ClientesTab";
import { PropuestasTab } from "./PropuestasTab";
import { VouchersTab } from "./VouchersTab";
import { VisitasTab } from "./VisitasTab";

type TabKey = "clientes" | "propuestas" | "vouchers" | "visitas";

export function CRMPage() {
  const [tab, setTab] = useState<TabKey>("clientes");

  return (
    <section className="content">
      <div className="container-fluid">
        <div className="card">
          <div className="card-header bg-success text-white">
            <h3 className="card-title mb-0">CRM</h3>
          </div>
          <div className="card-body">
            <ul className="nav nav-tabs" role="tablist">
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === "clientes" ? "active" : ""}`}
                  onClick={() => setTab("clientes")}
                  type="button"
                >
                  Clientes
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === "propuestas" ? "active" : ""}`}
                  onClick={() => setTab("propuestas")}
                  type="button"
                >
                  Propuestas
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === "vouchers" ? "active" : ""}`}
                  onClick={() => setTab("vouchers")}
                  type="button"
                >
                  Voucher
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === "visitas" ? "active" : ""}`}
                  onClick={() => setTab("visitas")}
                  type="button"
                >
                  Visitas
                </button>
              </li>
            </ul>
            <div className="mt-3">
              {tab === "clientes" && <ClientesTab />}
              {tab === "propuestas" && <PropuestasTab />}
              {tab === "vouchers" && <VouchersTab />}
              {tab === "visitas" && <VisitasTab />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
