import { useI18n, type Locale } from "./I18nContext";

const options: Array<{ value: Locale; shortLabel: string; labelKey: string }> = [
  { value: "pt", shortLabel: "PT", labelKey: "common.portuguese" },
  { value: "es", shortLabel: "ES", labelKey: "common.spanish" },
];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-2 py-1">
      <span className="hidden md:inline text-xs font-bold uppercase tracking-wide text-gray-500">
        {t("common.language")}
      </span>
      <div className="flex items-center gap-1">
        {options.map((option) => {
          const isActive = locale === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setLocale(option.value)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-black uppercase tracking-wide transition-all ${
                isActive
                  ? "bg-agro-primary text-white shadow shadow-agro-primary/20"
                  : "text-gray-500 hover:bg-white hover:text-agro-primary"
              }`}
              aria-pressed={isActive}
              title={t(option.labelKey)}
            >
              {option.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
