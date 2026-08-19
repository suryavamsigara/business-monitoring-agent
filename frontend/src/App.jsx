import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Dashboard } from "./pages/Dashboard";
import { Alerts } from "./pages/Alerts";
import { AlertDetail } from "./pages/AlertDetail";
import { Monitoring } from "./pages/Monitoring";
import { AgentRuns } from "./pages/AgentRuns";
import { AgentRunDetail } from "./pages/AgentRunDetail";
import { AgentAssistantModal } from "./components/AgentAssistantModal";
import { agentApi } from "./api/agentApi";
import { alertsApi } from "./api/alertsApi";
import confetti from "canvas-confetti";

export function App() {
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(null);
  const [agentStatus, setAgentStatus] = useState(null);
  const [alertSummary, setAlertSummary] = useState({ total: 0, critical: 0 });

  // Modals state
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantContext, setAssistantContext] = useState({
    alertId: null,
    runId: null,
    alertTitle: null,
  });

  // Global telemetry refresh
  const fetchGlobalStatus = useCallback(async () => {
    try {
      const [statusRes, alertsRes] = await Promise.all([
        agentApi.getStatus().catch(() => null),
        alertsApi.list().catch(() => ({ alerts: [], counts_by_severity: {} })),
      ]);

      if (statusRes) setAgentStatus(statusRes);
      if (alertsRes) {
        const total = alertsRes.alerts?.length || 0;
        const critical = alertsRes.counts_by_severity?.Critical || 0;
        setAlertSummary({ total, critical });
      }
    } catch (err) {
      console.error("Global status fetch failed:", err);
    }
  }, []);

  useEffect(() => {
    fetchGlobalStatus();
    const interval = setInterval(fetchGlobalStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchGlobalStatus]);

  // Run Agent Now execution handler
  const handleRunAgentNow = async () => {
    if (isAgentRunning) return;
    setIsAgentRunning(true);
    setRunProgress("Step 1/6: Observing raw sales & inventory telemetry...");

    const progressTimer1 = setTimeout(() => {
      setRunProgress("Step 2/6: Running deterministic anomaly detectors & z-scores...");
    }, 1200);
    const progressTimer2 = setTimeout(() => {
      setRunProgress("Step 3/6: Investigating multi-factor contributors with agent tools...");
    }, 2500);
    const progressTimer3 = setTimeout(() => {
      setRunProgress("Step 4/6: Synthesizing evidence & evaluating root-causes...");
    }, 3800);
    const progressTimer4 = setTimeout(() => {
      setRunProgress("Step 5/6: Scoring severity heuristics & estimating revenue at risk...");
    }, 5000);
    const progressTimer5 = setTimeout(() => {
      setRunProgress("Step 6/6: Generating deduplicated business alerts...");
    }, 6200);

    try {
      const res = await agentApi.runNow();
      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      clearTimeout(progressTimer3);
      clearTimeout(progressTimer4);
      clearTimeout(progressTimer5);

      setRunProgress(
        `✓ Monitoring Complete: ${res.anomalies_detected || 0} anomalies detected, ${res.alerts_created || 0} alerts generated.`
      );

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });

      await fetchGlobalStatus();
    } catch (err) {
      console.error("Agent run failed:", err);
      setRunProgress(`Agent execution error: ${err.message}`);
    } finally {
      setTimeout(() => {
        setIsAgentRunning(false);
        setRunProgress(null);
      }, 2000);
    }
  };

  const handleOpenAssistant = (context = {}) => {
    setAssistantContext({
      alertId: context.alertId || null,
      runId: context.runId || null,
      alertTitle: context.alertTitle || null,
    });
    setIsAssistantOpen(true);
  };

  return (
    <Router>
      <div className="flex h-screen w-full bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
        {/* Left Sidebar */}
        <Sidebar
          alertCount={alertSummary.total}
          criticalCount={alertSummary.critical}
          onOpenAssistant={() => handleOpenAssistant()}
          agentStatus={agentStatus}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
          <Header
            onRunNow={handleRunAgentNow}
            isRunning={isAgentRunning}
            onOpenAssistant={() => handleOpenAssistant()}
            onRefresh={fetchGlobalStatus}
          />

          <main className="flex-1 pb-16">
            <Routes>
              <Route
                path="/"
                element={
                  <Dashboard
                    onOpenAssistant={handleOpenAssistant}
                    onRunAgentNow={handleRunAgentNow}
                    isAgentRunning={isAgentRunning}
                    runProgress={runProgress}
                  />
                }
              />
              <Route path="/alerts" element={<Alerts />} />
              <Route
                path="/alerts/:alertId"
                element={
                  <AlertDetail
                    onOpenAssistantWithContext={handleOpenAssistant}
                  />
                }
              />
              <Route path="/monitoring" element={<Monitoring />} />
              <Route
                path="/runs"
                element={
                  <AgentRuns
                    onRunNow={handleRunAgentNow}
                    isRunning={isAgentRunning}
                  />
                }
              />
              <Route
                path="/runs/:runId"
                element={
                  <AgentRunDetail
                    onOpenAssistantWithContext={handleOpenAssistant}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>

        {/* Global Agent Assistant Modal */}
        <AgentAssistantModal
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
          alertId={assistantContext.alertId}
          runId={assistantContext.runId}
          alertTitle={assistantContext.alertTitle}
        />
      </div>
    </Router>
  );
}

export default App;
