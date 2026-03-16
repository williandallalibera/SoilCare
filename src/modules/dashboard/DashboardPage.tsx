import { useEffect, useState } from "react";
import { getDashboardSnapshot } from "../soil-analysis/repository";
import { formatNumber } from "../soil-analysis/utils";
import { useI18n } from "../i18n/I18nContext";

interface DashboardStats {
  clientes: number;
  areas: number;
  analises: number;
  usuarios: number;
  areaTotal: number;
  parametroAtivo: string;
}

const statsSeed: DashboardStats = {
  clientes: 0,
  areas: 0,
  analises: 0,
  usuarios: 0,
  areaTotal: 0,
  parametroAtivo: "-",
};

export function DashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<DashboardStats>(statsSeed);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const snapshot = await getDashboardSnapshot();
        setStats({
          clientes: snapshot.clientes.length,
          areas: snapshot.areas.length,
          analises: snapshot.analises.length,
          usuarios: snapshot.usuarios.length,
          areaTotal: snapshot.areas.reduce((sum, area) => sum + (area.tamanho_ha ?? 0), 0),
          parametroAtivo:
            snapshot.parametros.find((item) => item.is_active)?.version_label ??
            t("dashboard.noActiveVersion"),
        });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [t]);

  const cards = [
    {
      icon: "fa-users",
      label: t("dashboard.card.clientes"),
      value: stats.clientes.toString(),
      accent: "bg-sky-50 text-sky-700",
    },
    {
      icon: "fa-draw-polygon",
      label: t("dashboard.card.areas"),
      value: stats.areas.toString(),
      accent: "bg-stone-100 text-agro-primary",
    },
    {
      icon: "fa-vial-circle-check",
      label: t("dashboard.card.analises"),
      value: stats.analises.toString(),
      accent: "bg-amber-50 text-amber-700",
    },
    {
      icon: "fa-user-shield",
      label: t("dashboard.card.usuarios"),
      value: stats.usuarios.toString(),
      accent: "bg-violet-50 text-violet-700",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-agro-primary px-6 py-4">
          <h1 className="text-lg font-bold text-white">{t("dashboard.title")}</h1>
          <p className="text-sm text-white/80">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((card) => (
            <article
              key={card.label}
              className="rounded-2xl border border-gray-100 p-5 bg-gray-50/70"
            >
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${card.accent}`}>
                <i className={`fas ${card.icon}`} />
              </div>
              <p className="mt-4 text-sm font-bold text-gray-500 uppercase tracking-wide">
                {card.label}
              </p>
              <p className="mt-1 text-3xl font-black text-gray-900">
                {loading ? "..." : card.value}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
        <article className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">
            {t("dashboard.operation")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                {t("dashboard.areaTotal")}
              </p>
              <p className="text-2xl font-black text-gray-900 mt-2">
                {loading ? "..." : `${formatNumber(stats.areaTotal)} ha`}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                {t("dashboard.activeParams")}
              </p>
              <p className="text-lg font-bold text-gray-900 mt-2">
                {loading ? "..." : stats.parametroAtivo}
              </p>
            </div>
          </div>
        </article>

        <article className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">
            {t("dashboard.v1Title")}
          </h2>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex gap-3">
              <i className="fas fa-check-circle text-agro-primary mt-0.5" />
              {t("dashboard.v1.1")}
            </li>
            <li className="flex gap-3">
              <i className="fas fa-check-circle text-agro-primary mt-0.5" />
              {t("dashboard.v1.2")}
            </li>
            <li className="flex gap-3">
              <i className="fas fa-check-circle text-agro-primary mt-0.5" />
              {t("dashboard.v1.3")}
            </li>
            <li className="flex gap-3">
              <i className="fas fa-check-circle text-agro-primary mt-0.5" />
              {t("dashboard.v1.4")}
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}
