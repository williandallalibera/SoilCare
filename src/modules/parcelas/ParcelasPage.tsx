import { useState } from "react";
import { ParcelasTab } from "./ParcelasTab";
import { ZafrasTab } from "./ZafrasTab";

type TabKey = "parcelas" | "zafras";

export function ParcelasPage() {
  const [tab, setTab] = useState<TabKey>("parcelas");

  return (
    <section className="content">
      <div className="container-fluid">
        <div className="card">
          <div className="card-header bg-success text-white">
            <h3 className="card-title mb-0">Parcelas</h3>
          </div>
          <div className="card-body">
            <ul className="nav nav-tabs" role="tablist">
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === "parcelas" ? "active" : ""}`}
                  onClick={() => setTab("parcelas")}
                  type="button"
                >
                  Parcelas
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === "zafras" ? "active" : ""}`}
                  onClick={() => setTab("zafras")}
                  type="button"
                >
                  Zafras
                </button>
              </li>
            </ul>
            <div className="mt-3">
              {tab === "parcelas" && <ParcelasTab />}
              {tab === "zafras" && <ZafrasTab />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
