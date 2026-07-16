import { Component, type ErrorInfo, type ReactNode } from "react";

function errorCopy() {
  const zh = window.localStorage.getItem("berkshire-13f-language") === "zh-TW";
  return zh
    ? {
        label: "應用程式錯誤",
        title: "Dashboard 無法正常顯示。",
        body: "資料或畫面渲染發生問題。此頁會顯示錯誤訊息而不是空白畫面，方便診斷原因。",
      }
    : {
        label: "Application error",
        title: "The dashboard could not render.",
        body:
          "A data or rendering issue occurred. The page is showing this message instead of a blank screen so the problem can be diagnosed.",
      };
}

export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Application render error", error, info);
  }

  render() {
    if (this.state.error) {
      const copy = errorCopy();
      return (
        <div className="min-h-screen bg-paper px-4 py-8 text-ink">
          <div className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-red-600">{copy.label}</p>
            <h1 className="mt-2 text-2xl font-semibold">{copy.title}</h1>
            <p className="mt-3 text-sm text-stone-600">{copy.body}</p>
            <pre className="mt-4 overflow-x-auto rounded-md bg-red-50 p-4 text-xs text-red-800">
              {this.state.error.message}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
