import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { assistantApi } from "../api/assistantApi";
import {
  Bot,
  Send,
  Sparkles,
  X,
  Wrench,
  User,
  HelpCircle,
  Copy,
  Check
} from "lucide-react";
import { cn } from "../utils/cn";

const SUGGESTED_QUESTIONS = [
  "Why was this alert classified as Critical?",
  "What evidence supports this anomaly?",
  "What tools did you execute during investigation?",
  "What should our operations team do first?",
  "Which active alert should I prioritize right now?",
  "Explain the likely contributors behind this metric drop."
];

export function AgentAssistantModal({
  isOpen,
  onClose,
  alertId = null,
  runId = null,
  alertTitle = null
}) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: alertTitle
        ? `Hello! I am your **Business Pulse Agent Assistant**. I've loaded the investigation context for **${alertTitle}**.\n\nAsk me about detected anomalies, tool evidence, root-cause hypotheses, or prioritized recommendations.`
        : "Hello! I am your **Business Pulse Agent Assistant**.\n\nAsk me anything about active alerts, recent agent runs, monitored KPI anomalies, or what actions to prioritize first.",
      tool_calls: [],
      mode: "assistant",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleSend = async (userText) => {
    const textToSend = userText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    if (!userText) setInput("");
    setIsLoading(true);

    try {
      const historyForApi = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await assistantApi.chat({
        message: textToSend,
        alert_id: alertId,
        run_id: runId,
        history: historyForApi,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.answer || "I reviewed the available telemetry data.",
          tool_calls: res.tool_calls || [],
          mode: res.mode,
          error: res.error,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Unable to process request: ${err.message}. Showing on-record alert context.`,
          tool_calls: [],
          mode: "error",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg h-[92vh] max-h-[820px] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold shadow-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Agent Assistant</h3>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Telemetry & Audit Q&A
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[280px]">
                {alertTitle ? `Context: ${alertTitle}` : "Interactive Alert & Run Diagnostics"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-slate-50/50">
          {messages.map((msg, idx) => {
            const isUser = msg.role === "user";

            return (
              <div
                key={idx}
                className={cn("flex gap-3 group", isUser ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[88%] rounded-xl p-3.5 space-y-2 leading-relaxed relative",
                    isUser
                      ? "bg-slate-900 text-white font-medium rounded-tr-none shadow-sm"
                      : "bg-white border border-slate-200/90 text-slate-800 rounded-tl-none shadow-xs"
                  )}
                >
                  {/* Markdown Renderer for Assistant and User */}
                  <div className={cn("prose prose-xs max-w-none break-words", isUser ? "prose-invert text-white" : "text-slate-800")}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                        strong: ({ children }) => (
                          <strong className={isUser ? "font-bold text-white" : "font-bold text-slate-950"}>
                            {children}
                          </strong>
                        ),
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        code: ({ inline, className, children, ...props }) => {
                          return inline ? (
                            <code className={cn("px-1.5 py-0.5 rounded font-mono text-[11px]", isUser ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-800")} {...props}>
                              {children}
                            </code>
                          ) : (
                            <div className="my-2 rounded-lg bg-slate-900 border border-slate-800 p-2.5 overflow-x-auto">
                              <pre className="font-mono text-[11px] text-slate-100 m-0">
                                <code {...props}>{children}</code>
                              </pre>
                            </div>
                          );
                        },
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-2 border-slate-300 pl-3 my-2 text-slate-600 italic">
                            {children}
                          </blockquote>
                        ),
                        table: ({ children }) => (
                          <div className="my-2 overflow-x-auto">
                            <table className="min-w-full text-left border-collapse border border-slate-200 text-[11px]">
                              {children}
                            </table>
                          </div>
                        ),
                        th: ({ children }) => (
                          <th className="border border-slate-200 bg-slate-100 px-2 py-1 text-slate-800 font-semibold">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-slate-200 px-2 py-1 text-slate-600">
                            {children}
                          </td>
                        ),
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 underline hover:text-blue-700">
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {/* Copy button on hover for assistant messages */}
                  {!isUser && (
                    <button
                      onClick={() => handleCopy(msg.content, idx)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all"
                      title="Copy response"
                    >
                      {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}

                  {/* If tools were invoked */}
                  {!isUser && msg.tool_calls && msg.tool_calls.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                      <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1 mb-1.5">
                        <Wrench className="w-3 h-3 text-slate-600" />
                        <span>Tools Executed ({msg.tool_calls.length}):</span>
                      </div>
                      <div className="space-y-1">
                        {msg.tool_calls.map((t, tIdx) => (
                          <div
                            key={tIdx}
                            className="text-[11px] font-mono bg-slate-100 px-2.5 py-1 rounded border border-slate-200 text-slate-700 truncate"
                          >
                            {t.tool}({JSON.stringify(t.args || {})})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isUser && msg.error && (
                    <div className="text-[10px] text-rose-600 font-mono italic mt-1">
                      {msg.error}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-slate-600 flex items-center gap-2 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-bounce [animation-delay:0.4s]" />
                <span className="text-[11px] text-slate-500 font-mono ml-1">Pulling up the latest metrics...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Question Chips */}
        <div className="p-3 bg-white border-t border-slate-200">
          <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-slate-500" />
            <span>Suggested Inquiries</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                disabled={isLoading}
                className="whitespace-nowrap text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 transition-colors flex-shrink-0"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask agent about this alert, contributors, or recommendations..."
            disabled={isLoading}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-200",
              input.trim() && !isLoading
                ? "bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
