import { CalendarClock, CalendarDays, Landmark, PieChart, WalletCards } from "lucide-react";
import { useLanguage } from "../i18n";
import type { LatestData } from "../types/holding";

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function dateTime(value: string | null, locale: string): string {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function DashboardCards({ latest }: { latest: LatestData }) {
  const { language, t } = useLanguage();
  const cards = [
    { label: t("reportPeriod"), value: latest.reportDate ?? t("pending"), icon: CalendarDays },
    { label: t("filingDate"), value: latest.filingDate ?? t("pending"), icon: Landmark },
    { label: t("lastUpdated"), value: dateTime(latest.generatedAt, language) || t("pending"), icon: CalendarClock },
    { label: t("totalMarketValue"), value: money(latest.totalValue), icon: WalletCards },
    { label: t("holdings"), value: latest.holdingsCount.toLocaleString("en-US"), icon: PieChart },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-stone-500">{card.label}</p>
              <Icon className="h-5 w-5 text-brass" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-ink">{card.value}</p>
          </div>
        );
      })}
    </section>
  );
}
