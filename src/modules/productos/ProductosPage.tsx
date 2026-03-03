import { useState } from "react";
import { DistribuidorTab } from "./DistribuidorTab";
import { ProductoTab } from "./ProductoTab";

type TabKey = "distribuidor" | "producto";

export function ProductosPage() {
  const [tab, setTab] = useState<TabKey>("distribuidor");

  return (
    <section className="content">
      <div className="container-fluid">
        <div className="card">
          <div className="card-header bg-success text-white">
            <h3 className="card-title mb-0">Productos</h3>
          </div>
          <div className="card-body">
            <ul className="nav nav-tabs" role="tablist">
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === "distribuidor" ? "active" : ""}`}
                  onClick={() => setTab("distribuidor")}
                  type="button"
                >
                  Distribuidor
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === "producto" ? "active" : ""}`}
                  onClick={() => setTab("producto")}
                  type="button"
                >
                  Producto
                </button>
              </li>
            </ul>
            <div className="mt-3">
              {tab === "distribuidor" && <DistribuidorTab />}
              {tab === "producto" && <ProductoTab />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
