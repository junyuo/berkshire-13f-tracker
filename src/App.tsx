import { BarChart3, LineChart, RefreshCw, Table2, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Dashboard from "./pages/Dashboard";
import Holdings from "./pages/Holdings";
import Changes from "./pages/Changes";
import Performance from "./pages/Performance";
import { useLanguage, type TranslationKey } from "./i18n";
import type { Holding, HistoryItem, LatestData, PerformanceData, QuarterData } from "./types/holding";

type Page = "dashboard" | "holdings" | "changes" | "performance";

const pages: { id: Page; labelKey: TranslationKey; icon: typeof BarChart3 }[] = [
  { id: "dashboard", labelKey: "navDashboard", icon: BarChart3 },
  { id: "holdings", labelKey: "navHoldings", icon: Table2 },
  { id: "changes", labelKey: "navChanges", icon: TrendingUp },
  { id: "performance", labelKey: "navPerformance", icon: LineChart },
];

function routeFromHash(): Page {
  const hash = window.location.hash.replace("#/", "");
  return hash === "holdings" || hash === "changes" || hash === "performance" ? hash : "dashboard";
}

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}`);
  }
  return response.json();
}

export default function App() {
  const { language, setLanguage, t } = useLanguage();
  const [page, setPage] = useState<Page>(routeFromHash);
  const [latest, setLatest] = useState<LatestData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [quarters, setQuarters] = useState<QuarterData[]>([]);
  const [changes, setChanges] = useState<Holding[]>([]);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onHashChange = () => setPage(routeFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    Promise.all([
      loadJson<LatestData>("data/latest.json"),
      loadJson<HistoryItem[]>("data/history.json"),
      loadJson<Holding[]>("data/changes.json"),
      loadJson<QuarterData[]>("data/quarters.json"),
    ])
      .then(([latestData, historyData, changesData, quartersData]) => {
        setLatest(latestData);
        setHistory(historyData);
        setChanges(changesData);
        setQuarters(quartersData);
      })
      .catch((loadError: Error) => setError(loadError.message));

    loadJson<PerformanceData>("data/performance.json")
      .then(setPerformance)
      .catch(() => setPerformance(null));
  }, []);

  const activePage = useMemo(() => {
    if (!latest) {
      return (
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-stone-600 shadow-sm">
          {t("loadingData")}
        </div>
      );
    }
    if (page === "holdings") return <Holdings holdings={latest.holdings} quarters={quarters} />;
    if (page === "changes") return <Changes changes={changes} quarters={quarters} />;
    if (page === "performance") return <Performance performance={performance} />;
    return <Dashboard latest={latest} history={history} changes={changes} quarters={quarters} performance={performance} />;
  }, [changes, history, latest, page, performance, quarters, t]);

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-brass">Berkshire Hathaway</p>
              <h1 className="mt-1 text-3xl font-semibold text-ink">13F Tracker</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex rounded-md border border-stone-300 bg-white p-1 text-sm font-medium">
                {(["en", "zh-TW"] as const).map((item) => (
                  <button
                    key={item}
                    className={`rounded px-3 py-1.5 ${language === item ? "bg-ink text-white" : "text-stone-600 hover:bg-stone-50"}`}
                    onClick={() => setLanguage(item)}
                  >
                    {item === "en" ? "EN" : "繁中"}
                  </button>
                ))}
              </div>
              <a
                className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-moss hover:bg-stone-50"
                href={latest?.secUrl ?? "https://www.sec.gov/edgar/browse/?CIK=1067983"}
                target="_blank"
                rel="noreferrer"
              >
                <RefreshCw className="h-4 w-4" />
                {t("secFiling")}
              </a>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto">
            {pages.map((navPage) => {
              const Icon = navPage.icon;
              const isActive = page === navPage.id;
              return (
                <a
                  key={navPage.id}
                  href={`#/${navPage.id === "dashboard" ? "" : navPage.id}`}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                    isActive ? "bg-ink text-white" : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t(navPage.labelKey)}
                </a>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {t("dataLoadError")} {error}
          </div>
        ) : (
          activePage
        )}
      </main>
    </div>
  );
}
