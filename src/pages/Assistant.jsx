import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, SendHorizonal } from "lucide-react";
import { api } from "../services/api";
import { clearAuth } from "../utils/auth";

function compactValue(value) {
  if (value == null) return "N/A";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "string") return value.length > 120 ? `${value.slice(0, 117)}...` : value;
  if (Array.isArray(value)) return `${value.length} items`;
  if (typeof value === "object") {
    if (value.name && value.value != null) return `${value.name} (${value.value})`;
    if (value.name) return String(value.name);
    if (value.id != null) return `ID ${value.id}`;
    const keys = Object.keys(value);
    if (!keys.length) return "empty";
    return `${keys.slice(0, 3).join(", ")}`;
  }
  return String(value);
}

function formatQuerySummary(data) {
  if (!data || typeof data !== "object") return "";

  const lines = Object.entries(data)
    .slice(0, 8)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        const preview = value
          .slice(0, 3)
          .map((item) => {
            if (item && typeof item === "object") {
              return item.name || item.id || compactValue(item);
            }
            return compactValue(item);
          })
          .join(", ");
        return `- ${key}: ${value.length} items${preview ? ` (${preview})` : ""}`;
      }
      return `- ${key}: ${compactValue(value)}`;
    });

  return lines.join("\n");
}

function buildAssistantText(response) {
  const reply = response?.reply || "I could not process that request.";
  if (response?.action !== "query_answer") {
    const details = formatDataSummary(response?.action, response?.data);
    return `${reply}${details}`;
  }

  const summary = formatQuerySummary(response?.data);
  if (!summary) return reply;
  return `${reply}\n\nSummary:\n${summary}`;
}

function isLogoutIntent(text) {
  const normalized = String(text || "").toLowerCase().trim();
  return /\b(logout|log out|sign out|signout)\b/.test(normalized);
}

function formatDataSummary(action, data) {
  if (!data) return "";

  if (action === "resident_created") {
    return `\nID: ${data.id}\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nRole: ${data.role}\nFlat: ${data.flatNumber || data.flatId}\nStatus: ${data.status}`;
  }
  if (action === "complaint_created") {
    return `\nTicket: ${data.id}\nCategory: ${data.category}\nPriority: ${data.priority}\nStatus: ${data.status}`;
  }
  if (action === "visitor_created" || action === "visitor_updated") {
    return `\nID: ${data.id}\nName: ${data.name}\nFlat: ${data.flat}\nStatus: ${data.status}`;
  }
  if (action === "query_answer" && data && typeof data === "object") {
    const keys = Object.keys(data).slice(0, 4);
    if (!keys.length) return "";
    return `\n${keys.map((key) => `${key}: ${JSON.stringify(data[key])}`).join("\n")}`;
  }
  return "";
}

function Assistant() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      from: "assistant",
      text:
        "Hello Admin. I can answer website data questions and perform tasks. Examples: add resident name: Rahul Sharma email: rahul@gmail.com phone: 9876543210 flat: A-101 password: Rahul@123 | raise complaint: water leakage in B wing high | add visitor name: Amit phone: 9876543210 flat: A-101 purpose: delivery | mark complaint CMP-12 resolved | approve visitor 15",
    },
  ]);

  const hasMessages = useMemo(() => messages.length > 0, [messages.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event) => {
      let transcript = "";
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0]?.transcript || "";
        transcript += chunk;
        if (event.results[i].isFinal) {
          finalTranscript += chunk;
        }
      }
      if (transcript.trim()) {
        setInput(transcript.trim());
      }
      if (finalTranscript.trim()) {
        submitMessage(finalTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      setVoiceError(`Voice error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const submitMessage = async (rawText) => {
    const text = String(rawText || "").trim();
    if (!text || loading) return;

    const userMessage = {
      id: Date.now(),
      from: "user",
      text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    if (isLogoutIntent(text)) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          from: "assistant",
          text: "Logging you out now.",
        },
      ]);
      clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return;
    }

    setLoading(true);

    try {
      const response = await api.askAssistant(text);
      const assistantMessage = {
        id: Date.now() + 1,
        from: "assistant",
        text: buildAssistantText(response),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          from: "assistant",
          text: `Request failed: ${error.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = (event) => {
    event.preventDefault();
    submitMessage(input);
  };

  const toggleVoice = () => {
    setVoiceError("");
    if (!voiceSupported || !recognitionRef.current || loading) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setVoiceError("Unable to start microphone. Please allow mic permission and try again.");
      setIsListening(false);
    }
  };

  return (
    <section className="flex min-h-[70vh] flex-col rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur">
      <div className="mb-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {hasMessages &&
          messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`max-w-xl rounded-2xl px-4 py-3 text-sm ${
                message.from === "assistant" ? "bg-white/10 text-slate-100" : "ml-auto bg-indigo-600 text-white"
              }`}
            >
              <div className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed">
                {message.text}
              </div>
            </motion.div>
          ))}

        {loading && (
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            className="inline-flex items-center gap-1 rounded-2xl bg-white/10 px-4 py-2 text-xs text-slate-200"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
            <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
            <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
            AI is typing...
          </motion.div>
        )}
      </div>

      <form onSubmit={sendMessage} className="mt-auto flex items-center gap-3 rounded-2xl border border-white/20 bg-slate-900/70 p-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask AI assistant..."
          className="w-full bg-transparent px-3 py-2 text-sm text-slate-100 outline-none"
        />
        <button
          type="button"
          onClick={toggleVoice}
          disabled={!voiceSupported || loading}
          className={`rounded-xl p-2.5 text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
            isListening ? "bg-rose-600 hover:bg-rose-500" : "bg-slate-600 hover:bg-slate-500"
          }`}
          title={voiceSupported ? (isListening ? "Stop voice input" : "Start voice input") : "Voice input not supported"}
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-indigo-600 p-2.5 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <SendHorizonal size={16} />
        </button>
      </form>
      {!voiceSupported && <p className="mt-2 text-xs text-amber-200">Voice input is not supported in this browser.</p>}
      {voiceError && <p className="mt-2 text-xs text-rose-600">{voiceError}</p>}
    </section>
  );
}

export default Assistant;
