import { useEffect } from "react";
import { connectEvents } from "./api/events";
import { api, download } from "./api/client";
import { useData, refresh, onEvent, perform, toggleGlobal } from "./store/data";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toolbar } from "./components/layout/Toolbar";
import { Sidebar } from "./components/layout/Sidebar";
import { StatusBar } from "./components/layout/StatusBar";
import { ModalHost } from "./components/modals/ModalHost";
import { useUI } from "./store/ui";
import { NetworkPage } from "./pages/NetworkPage";
import { RulesPage } from "./pages/RulesPage";
import { ValuesPage } from "./pages/ValuesPage";
import { ScriptsPage } from "./pages/ScriptsPage";
import { BreakpointsPage } from "./pages/BreakpointsPage";
import { ComposePage } from "./pages/ComposePage";
import { ThrottlePage } from "./pages/ThrottlePage";
import { DevicesPage } from "./pages/DevicesPage";
import { CertificatePage } from "./pages/CertificatePage";
import { SettingsPage } from "./pages/SettingsPage";

function useThemeAttr() {
  const theme = useUI((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);
}

export function App() {
  useThemeAttr();
  const { error, notice, connected } = useData();
  useEffect(() => {
    void refresh();
    return connectEvents(onEvent, (connected) =>
      useData.setState({ connected }),
    );
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const input = (e.target as HTMLElement)?.closest(
        "input,textarea,[contenteditable=true]",
      );
      if (input) return;
      if (e.key === "?") {
        useUI.getState().openModal({ type: "shortcuts" });
      }
      if (e.ctrlKey || e.metaKey) {
        if (
          e.key.toLowerCase() === "f" &&
          document.getElementById("network-filter")
        ) {
          e.preventDefault();
          document.getElementById("network-filter")?.focus();
        }
        if (e.key.toLowerCase() === "r") {
          e.preventDefault();
          void toggleGlobal("recording");
        }
        if (e.key.toLowerCase() === "k") {
          e.preventDefault();
          void perform(() => api.clearSessions());
        }
        if (e.key.toLowerCase() === "s") {
          e.preventDefault();
          void perform(async () =>
            download(await api.exportHar(), "charstle.har"),
          );
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <HashRouter>
      <div className="app">
        {(error || notice || !connected) && (
          <div className="app-notice" role={error ? "alert" : "status"}>
            <span>{error || notice || "正在连接代理服务…"}</span>
            {error && (
              <button
                className="btn btn-sm"
                onClick={() => useData.setState({ error: "" })}
              >
                关闭
              </button>
            )}
          </div>
        )}
        <Toolbar />
        <Sidebar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/network" replace />} />
            <Route path="/network" element={<NetworkPage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/values" element={<ValuesPage />} />
            <Route path="/scripts" element={<ScriptsPage />} />
            <Route path="/breakpoints" element={<BreakpointsPage />} />
            <Route path="/compose" element={<ComposePage />} />
            <Route path="/throttle" element={<ThrottlePage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/ssl" element={<CertificatePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/network" replace />} />
          </Routes>
        </main>
        <StatusBar />
        <ModalHost />
      </div>
    </HashRouter>
  );
}
