import { useState, useEffect, useRef } from "react";
import API from "../api/api";
import { 
  UploadCloud, CheckCircle, Bot, Loader2, FileText, Hash, AlertCircle,
  FileCode, Layers, Languages, BookOpen, AlertTriangle, Rocket, Sparkles, 
  Check, ChevronDown, ChevronUp, Copy, CheckCircle2, Send, Trash2, RefreshCw
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function Upload() {
  const [uploadMeta, setUploadMeta] = useState(null); // { filename, chunks }
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [report, setReport] = useState(null); // { type, pages, language, executive_summary, ... }
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // RAG Q&A states
  const [docQuery, setDocQuery] = useState("");
  const [docMessages, setDocMessages] = useState([]);
  const [queryLoading, setQueryLoading] = useState(false);
  
  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [docMessages, queryLoading]);

  // Check active document on mount
  useEffect(() => {
    const checkActiveDoc = async () => {
      try {
        const res = await API.get("/upload/active");
        if (res.data && res.data.active) {
          setUploadMeta({ filename: res.data.filename, chunks: res.data.chunks });
          setFileName(res.data.filename);
          setDocMessages([
            { role: "assistant", text: `Neural link active. I have loaded context from **${res.data.filename}** (${res.data.chunks} chunks indexed). How may I assist you with this document?` }
          ]);
          
          // Check if report exists
          try {
            const reportRes = await API.get(`/upload/report?filename=${encodeURIComponent(res.data.filename)}`);
            if (reportRes.data && !reportRes.data.error) {
              setReport(reportRes.data);
            }
          } catch (rErr) {
            console.error("Report fetch error:", rErr);
          }
        }
      } catch (err) {
        console.error("Failed to fetch active document status:", err);
      }
    };
    checkActiveDoc();
  }, []);

  const askDocAI = async () => {
    if (!docQuery.trim() || !uploadMeta) return;
    const userQ = docQuery.trim();
    setDocQuery("");
    
    // Add User message immediately to the chat thread
    setDocMessages(prev => [...prev, { role: "user", text: userQ }]);
    setQueryLoading(true);

    try {
      // Map docMessages history to the backend format
      const historyPayload = docMessages.map(msg => ({
        role: msg.role,
        content: msg.text
      }));

      const res = await API.post("/upload/query", { 
        question: userQ,
        history: historyPayload
      });
      
      if (res.data.error) {
        setDocMessages(prev => [...prev, { role: "assistant", text: `Error: ${res.data.message || "Failed to query document"}` }]);
      } else {
        setDocMessages(prev => [...prev, { role: "assistant", text: res.data.answer }]);
      }
    } catch (err) {
      console.error(err);
      setDocMessages(prev => [...prev, { role: "assistant", text: "Error: Connection to RAG Query Engine failed." }]);
    }
    setQueryLoading(false);
  };

  // Accordion active topic index
  const [expandedTopic, setExpandedTopic] = useState(0);

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setReport(null);
    setUploadMeta(null);
    setError("");
    setCopied(false);
    setDocMessages([]); // Reset chat

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await API.post("/upload/", formData);

      if (res.data.error) {
        setError(`${res.data.message}: ${res.data.error}`);
        setLoading(false);
        return;
      }

      setUploadMeta({ filename: res.data.filename, chunks: res.data.chunks });
      setDocMessages([
        { role: "assistant", text: `Successfully indexed **${res.data.filename}** into the RAG vector database. How can I help you extract insights from this file?` }
      ]);
      setLoading(false);

    } catch (err) {
      console.error(err);
      setError("SYS_ERR: Backend connection failed.");
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!uploadMeta) return;
    setSummarizing(true);
    setError("");
    try {
      const analyzeRes = await API.post("/upload/analyze", {
        filename: uploadMeta.filename
      });

      if (analyzeRes.data.error) {
        setError(analyzeRes.data.message || "Failed to analyze document.");
      } else {
        setReport(analyzeRes.data);
      }
    } catch (err) {
      console.error(err);
      setError("Could not generate report — analysis pipeline error.");
    }
    setSummarizing(false);
  };

  const clearContext = async () => {
    if (!window.confirm("Are you sure you want to clear the active document and reset the RAG database?")) return;
    setLoading(true);
    try {
      await API.post("/upload/clear");
      setUploadMeta(null);
      setReport(null);
      setFileName("");
      setDocMessages([]);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to clear backend context.");
    }
    setLoading(false);
  };

  const copyAsMarkdown = () => {
    if (!report) return;
    const md = `# 📄 Document Analysis Report

## 📋 Basic Information

* **File Name:** ${fileName || report.filename || "Uploaded File"}
* **Document Type:** ${report.type || "Document"}
* **Pages:** ${report.pages || "1 page"}
* **Language:** ${report.language || "English"}

---

# 📝 Executive Summary

${report.executive_summary}

---

# 🎯 Main Topics Covered

${report.main_topics?.map((t, i) => `${i + 1}. ${t}`).join("\n")}

---

# 🔍 Detailed Analysis

${report.detailed_analysis?.map((item) => `## ${item.topic}

* ${item.key_points?.join("\n* ")}

### Important Findings

${item.findings}`).join("\n\n---\n\n")}

---

# 📊 Important Data & Statistics

| Metric | Value |
| ------ | ----- |
${report.data_statistics?.map((row) => `| ${row.metric} | ${row.value} |`).join("\n")}

---

# 💡 Key Insights

* ${report.key_insights?.join("\n* ")}

---

# ⚠ Risks / Limitations

* ${report.risks_limitations?.join("\n* ")}

---

# 🚀 Recommendations

${report.recommendations?.map((r, i) => `${i + 1}. ${r}`).join("\n")}

---

# 📌 Conclusion

${report.conclusion}

---

# 🔑 Quick Takeaways

${report.quick_takeaways?.map((t) => `✅ ${t}`).join("\n")}
`;

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto pb-12">

      <div className="mb-8 flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl text-[#e9e6f9] mb-2 tracking-tight">Context Assimilation</h1>
          <p className="text-[#aba9bb]">Upload neural nodes (PDFs, text files) to build intelligence report dashboards and chat via RAG.</p>
        </div>
        {report && (
          <button
            onClick={copyAsMarkdown}
            className="flex items-center gap-2 bg-[#121220] hover:bg-[#1e1e2f] text-sm text-[#b6a0ff] border border-[#b6a0ff]/20 hover:border-[#b6a0ff]/40 px-4 py-2.5 rounded-lg transition-all"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Copied Markdown!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Raw Report (Markdown)</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 glass-card p-5 border-l-4 border-red-500/60 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 font-mono text-sm">{error}</p>
        </div>
      )}

      {/* Main Workspace Split Layout */}
      {!uploadMeta && !loading ? (
        /* Standby State (Offline) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Panel: Drop Zone */}
          <div className="lg:col-span-5 flex flex-col h-full">
            <div className="relative group flex-grow flex flex-col">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#b6a0ff] to-[#00affe] rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

              <div className="relative flex-grow glass-card border-dashed border-2 border-white/20 p-10 flex flex-col items-center justify-center text-center transition-all duration-300 hover:border-[#b6a0ff]/50 min-h-[350px]">
                <div className="p-4 rounded-full bg-[#121220] border border-white/5 shadow-glow-primary mb-6">
                  <UploadCloud className="w-10 h-10 text-[#b6a0ff]" />
                </div>

                <h3 className="font-display text-xl mb-2 text-[#e9e6f9]">Initialize Data Transfer</h3>
                <p className="text-[#aba9bb] text-xs max-w-xs mb-8">
                  Select or drag a PDF, TXT, or markdown file to index into the neural context vector database.
                </p>

                <label className="cursor-pointer bg-primary-gradient px-8 py-3 rounded-lg text-black font-semibold tracking-wide hover:shadow-glow-primary transition-all text-xs">
                  SELECT DOCUMENT
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.txt,.doc,.docx"
                    onChange={uploadFile}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Right Panel: Standby RAG Chatbox */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="glass-card p-6 border-t-2 border-t-white/10 flex-grow flex flex-col min-h-[350px] justify-between relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/5 opacity-[0.02] blur-[50px] pointer-events-none rounded-full"></div>
              
              <div>
                <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-3">
                  <Bot className="w-5 h-5 text-[#aba9bb]" />
                  <h3 className="font-display text-sm text-[#aba9bb]">RAG Standby</h3>
                </div>
                
                <div className="flex flex-col items-center justify-center text-center py-16 px-4">
                  <RefreshCw className="w-10 h-10 text-white/10 animate-spin-slow mb-4" />
                  <h4 className="text-sm font-semibold text-[#e9e6f9] mb-1">Neural link offline</h4>
                  <p className="text-xs text-[#aba9bb] max-w-xs leading-relaxed">
                    Upload a document to index it and activate Retrieval-Augmented Generation (RAG) query capabilities.
                  </p>
                </div>
              </div>
              
              {/* Mock input bar */}
              <div className="border-t border-white/5 pt-4 opacity-30 pointer-events-none">
                <div className="flex gap-3">
                  <input
                    type="text"
                    className="flex-1 bg-[#121220] border border-white/10 text-white/50 px-4 py-2.5 rounded-lg text-xs"
                    placeholder="RAG offline. Awaiting node activation..."
                    disabled
                  />
                  <button className="bg-white/10 px-5 py-2.5 rounded-lg text-white/50 text-xs font-semibold">
                    ASK AI
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Active State */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Active File Info & Small Uploader */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Active File Card */}
            <div className="glass-card p-6 border-l-4 border-l-[#00affe] relative overflow-hidden flex flex-col justify-between min-h-[260px]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#00affe]/5 blur-[30px] rounded-full pointer-events-none"></div>
              
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${
                    loading ? "bg-amber-400 shadow-amber-400 animate-pulse" :
                    summarizing ? "bg-purple-400 shadow-purple-400 animate-pulse" :
                    "bg-[#00affe] shadow-[#00affe] animate-pulse"
                  }`}></div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#aba9bb]">
                    {loading ? "ASSIMILATING..." : summarizing ? "ANALYZING..." : "RAG ENGINE ONLINE"}
                  </span>
                </div>

                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-[#00affe]/10 text-[#00affe] border border-[#00affe]/20 shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-[#e9e6f9] truncate" title={fileName}>
                      {fileName || "Active Node"}
                    </h4>
                    <p className="text-[11px] font-mono text-[#aba9bb] mt-0.5">
                      {uploadMeta ? `${uploadMeta.chunks} chunks indexed` : "0 chunks"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/5">
                {/* Action: Generate Report */}
                {!report && !summarizing && (
                  <button
                    onClick={generateReport}
                    disabled={loading}
                    className="w-full bg-primary-gradient hover:shadow-glow-primary hover:scale-[1.02] active:scale-[0.98] text-black font-semibold py-2.5 rounded-lg transition-all text-xs uppercase tracking-wider"
                  >
                    Generate AI Report
                  </button>
                )}
                {summarizing && (
                  <button
                    disabled
                    className="w-full bg-[#121220] text-[#aba9bb] border border-white/5 py-2.5 rounded-lg text-xs font-mono flex items-center justify-center gap-2"
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-[#b6a0ff]" />
                    <span>Analyzing Document...</span>
                  </button>
                )}
                {report && (
                  <button
                    onClick={() => {
                      const element = document.getElementById("report-section");
                      if (element) {
                        element.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 py-2.5 rounded-lg transition-all text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Report Ready (Scroll Down)</span>
                  </button>
                )}

                {/* Action: Reset */}
                <button
                  onClick={clearContext}
                  disabled={loading || summarizing}
                  className="w-full bg-transparent hover:bg-red-500/5 text-red-400 border border-red-500/20 hover:border-red-500/40 py-2.5 rounded-lg transition-all text-xs font-semibold flex items-center justify-center gap-1.5 uppercase tracking-wider"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Reset Context</span>
                </button>
              </div>
            </div>

            {/* Mini Drop Zone to change file */}
            <div className="glass-card p-4 border-dashed border border-white/10 hover:border-[#b6a0ff]/40 transition-all flex flex-col items-center justify-center text-center">
              <UploadCloud className="w-6 h-6 text-[#aba9bb] mb-2" />
              <p className="text-[11px] text-[#aba9bb] mb-3">Swap active file context</p>
              <label className="cursor-pointer bg-[#121220] hover:bg-[#1e1e2f] border border-white/10 hover:border-white/20 text-[#e9e6f9] px-4 py-1.5 rounded text-[10px] font-mono transition-all">
                CHOOSE FILE
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={uploadFile}
                  disabled={loading || summarizing}
                />
              </label>
            </div>
          </div>

          {/* Right Column: RAG Chatbox */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="relative glass-card border-t-2 border-t-[#00affe] overflow-hidden flex flex-col h-[420px] justify-between">
              <div className="absolute top-1/2 right-10 -translate-y-1/2 w-48 h-48 bg-[#00affe] opacity-[0.02] blur-[60px] pointer-events-none rounded-full"></div>
              
              {/* Chatbox Header */}
              <div className="flex justify-between items-center p-4 border-b border-white/5 bg-[#121220]/20">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-[#00affe]" />
                  <div>
                    <h3 className="font-display text-sm font-semibold text-[#e9e6f9]">Document Intelligence Chat</h3>
                    <p className="text-[10px] text-[#aba9bb] font-mono leading-none">RAG Session Active</p>
                  </div>
                </div>
                {docMessages.length > 1 && (
                  <button 
                    onClick={() => {
                      if (window.confirm("Clear active chat session history?")) {
                        setDocMessages([
                          { role: "assistant", text: `Active chat cleared. Context from **${fileName}** is still active. How can I help you?` }
                        ]);
                      }
                    }}
                    className="text-[10px] font-mono text-red-400 hover:text-red-300 transition-colors border border-red-500/20 hover:border-red-500/40 px-2 py-1 rounded bg-red-500/5"
                  >
                    Clear Chat
                  </button>
                )}
              </div>

              {/* Chat Stream */}
              <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-4 scroll-smooth">
                {docMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex flex-col max-w-[85%] ${
                      msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'
                    }`}
                  >
                    <span className="text-[9px] font-mono text-[#aba9bb] mb-1 px-1">
                      {msg.role === 'user' ? 'USER' : 'ARCHIVIST AI'}
                    </span>
                    <div 
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-[#1e1e2f] text-[#e9e6f9] rounded-tr-sm border border-white/5' 
                          : 'glass-card border border-[#00affe]/20 bg-[#121220]/60 rounded-tl-sm shadow-[0_4px_12px_rgba(0,175,254,0.02)]'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="markdown-body text-xs text-[#e9e6f9] font-light leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="font-light">{msg.text}</p>
                      )}
                    </div>
                  </div>
                ))}
                {queryLoading && (
                  <div className="flex flex-col max-w-[85%] self-start items-start">
                    <span className="text-[9px] font-mono text-[#00affe] mb-1 px-1">ARCHIVIST AI (THINKING...)</span>
                    <div className="p-3 rounded-2xl glass-card border border-[#00affe]/20 bg-[#121220]/60 rounded-tl-sm flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00affe] animate-bounce"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00affe] animate-bounce delay-100"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00affe] animate-bounce delay-200"></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input area */}
              <div className="p-4 border-t border-white/5 bg-[#0d0d1a]/50 backdrop-blur-md">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 bg-[#121220] border border-white/10 text-[#e9e6f9] px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#00affe]/50 focus:shadow-glow-primary transition-all font-sans text-xs"
                    placeholder={`Ask something about ${fileName || 'this document'}...`}
                    value={docQuery}
                    onChange={(e) => setDocQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && askDocAI()}
                    disabled={queryLoading}
                  />
                  <button
                    onClick={askDocAI}
                    disabled={queryLoading || !docQuery.trim()}
                    className="bg-primary-gradient px-4 py-2.5 rounded-lg text-black font-semibold text-xs hover:shadow-glow-primary transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    {queryLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>SEND</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading state for report (if report not yet loaded, but summarizing is true) */}
      {summarizing && !report && (
        <div className="mt-6 glass-card p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <Loader2 className="w-5 h-5 text-[#a882ff] animate-spin" />
            <span className="font-mono text-sm tracking-widest uppercase text-[#a882ff]">
              Generating Intelligence Report...
            </span>
          </div>
          <div className="flex flex-col gap-3 py-4">
            <div className="h-4 bg-white/5 rounded-full w-3/4 animate-pulse"></div>
            <div className="h-4 bg-white/5 rounded-full w-full animate-pulse"></div>
            <div className="h-4 bg-white/5 rounded-full w-5/6 animate-pulse"></div>
            <div className="h-4 bg-white/5 rounded-full w-2/3 animate-pulse"></div>
          </div>
        </div>
      )}

      {/* AI Document Report Dashboard */}
      {report && (
        <div id="report-section" className="mt-8 flex flex-col gap-8 scroll-mt-24">
          
          {/* Header Card / Title */}
          <div className="relative glass-card p-6 border-l-4 border-l-[#b6a0ff] overflow-hidden">
            <div className="absolute top-1/2 right-10 -translate-y-1/2 w-48 h-48 bg-[#b6a0ff] opacity-[0.03] blur-[60px] pointer-events-none rounded-full"></div>
            <div className="flex items-center gap-3 mb-2">
              <Bot className="w-6 h-6 text-[#b6a0ff]" />
              <span className="font-mono text-xs uppercase tracking-widest text-[#b6a0ff]">Processed Node Report</span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl text-[#e9e6f9] tracking-tight">📄 Document Analysis Report</h2>
          </div>

          {/* Basic Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-4 flex items-center gap-4 bg-[#121220]/40">
              <div className="p-3 rounded-lg bg-[#b6a0ff]/10 text-[#b6a0ff] border border-[#b6a0ff]/20">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-mono tracking-widest text-[#aba9bb]">File Name</p>
                <p className="text-sm font-semibold text-[#e9e6f9] truncate" title={fileName || report.filename}>{fileName || report.filename || "Uploaded file"}</p>
              </div>
            </div>

            <div className="glass-card p-4 flex items-center gap-4 bg-[#121220]/40">
              <div className="p-3 rounded-lg bg-[#00affe]/10 text-[#00affe] border border-[#00affe]/20">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-mono tracking-widest text-[#aba9bb]">Document Type</p>
                <p className="text-sm font-semibold text-[#e9e6f9]">{report.type || "Document"}</p>
              </div>
            </div>

            <div className="glass-card p-4 flex items-center gap-4 bg-[#121220]/40">
              <div className="p-3 rounded-lg bg-[#e966ff]/10 text-[#e966ff] border border-[#e966ff]/20">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-mono tracking-widest text-[#aba9bb]">Pages</p>
                <p className="text-sm font-semibold text-[#e9e6f9]">{report.pages || "1 page"}</p>
              </div>
            </div>

            <div className="glass-card p-4 flex items-center gap-4 bg-[#121220]/40">
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Languages className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-mono tracking-widest text-[#aba9bb]">Language</p>
                <p className="text-sm font-semibold text-[#e9e6f9]">{report.language || "English"}</p>
              </div>
            </div>
          </div>

          {/* Quick Takeaways (Highlighted Banner) */}
          {report.quick_takeaways && report.quick_takeaways.length > 0 && (
            <div className="glass-card p-6 border-l-4 border-l-emerald-500 bg-emerald-500/5 relative overflow-hidden">
              <h3 className="font-display text-lg text-[#e9e6f9] mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>🔑 Quick Takeaways</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.quick_takeaways.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-[#121220]/50 p-3.5 rounded-xl border border-white/5 hover:border-emerald-500/20 transition-all duration-300">
                    <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 bg-emerald-500/10 rounded p-1 border border-emerald-500/20" />
                    <span className="text-sm text-[#e9e6f9]/90 font-light leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Two-Column Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left/Main Column - Span 2 */}
            <div className="lg:col-span-2 flex flex-col gap-6">

              {/* Executive Summary */}
              <div className="glass-card p-6 border-t-2 border-t-[#b6a0ff]">
                <h3 className="font-display text-xl text-[#e9e6f9] mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#b6a0ff]" />
                  <span>📝 Executive Summary</span>
                </h3>
                <div className="text-sm text-[#d4d0ea]/90 leading-relaxed space-y-4 font-light">
                  {report.executive_summary?.split("\n\n").map((p, i) => (
                    <p key={i} className="first-letter:text-xl first-letter:font-bold first-letter:text-[#b6a0ff]">
                      {p}
                    </p>
                  ))}
                </div>
              </div>

              {/* Detailed Analysis (Interactive Accordion) */}
              <div className="glass-card p-6 border-t-2 border-t-[#00affe]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-xl text-[#e9e6f9] flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#00affe]" />
                    <span>🔍 Detailed Analysis</span>
                  </h3>
                  <span className="text-xs font-mono text-[#aba9bb]">
                    {report.detailed_analysis?.length || 0} Topics Identified
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  {report.detailed_analysis?.map((item, idx) => {
                    const isExpanded = expandedTopic === idx;
                    return (
                      <div 
                        key={idx} 
                        className={`border rounded-xl transition-all duration-300 ${
                          isExpanded 
                            ? "bg-[#121220]/70 border-[#00affe]/30 shadow-[0_4px_20px_rgba(0,175,254,0.05)]" 
                            : "bg-[#121220]/30 border-white/5 hover:border-white/10"
                        }`}
                      >
                        {/* Topic Header Trigger */}
                        <button
                          onClick={() => setExpandedTopic(isExpanded ? null : idx)}
                          className="w-full flex items-center justify-between p-4 text-left font-display font-medium text-[#e9e6f9] hover:text-[#00affe] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-[#00affe] bg-[#00affe]/10 border border-[#00affe]/20 w-6 h-6 rounded-full flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span>{item.topic}</span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-[#aba9bb]" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-[#aba9bb]" />
                          )}
                        </button>

                        {/* Topic Body Content */}
                        {isExpanded && (
                          <div className="px-6 pb-6 pt-2 border-t border-white/5 animate-fadeIn">
                            <div className="mb-4">
                              <h4 className="text-xs font-mono text-[#aba9bb] uppercase tracking-wider mb-2.5">Key Points</h4>
                              <ul className="space-y-2">
                                {item.key_points?.map((pt, pIdx) => (
                                  <li key={pIdx} className="flex items-start gap-2.5 text-sm text-[#d4d0ea] font-light">
                                    <span className="text-[#00affe] mt-1.5 text-xs shrink-0">▸</span>
                                    <span>{pt}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div className="bg-[#0b0a10]/60 border border-white/5 rounded-lg p-4 mt-4">
                              <h5 className="text-[10px] uppercase font-mono tracking-widest text-[#00affe] mb-1.5 font-semibold">Important Findings</h5>
                              <p className="text-sm text-[#aba9bb] leading-relaxed font-light">{item.findings}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Important Data & Statistics */}
              {report.data_statistics && report.data_statistics.length > 0 && (
                <div className="glass-card p-6 border-t-2 border-t-[#e966ff]">
                  <h3 className="font-display text-xl text-[#e9e6f9] mb-4 flex items-center gap-2">
                    <Hash className="w-5 h-5 text-[#e966ff]" />
                    <span>📊 Important Data & Statistics</span>
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-white/5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/5 text-[#e966ff] text-xs font-mono uppercase tracking-wider">
                          <th className="p-4 font-semibold">Metric</th>
                          <th className="p-4 font-semibold">Value</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-[#d4d0ea] divide-y divide-white/5">
                        {report.data_statistics.map((row, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 font-medium text-[#e9e6f9] w-1/3">{row.metric}</td>
                            <td className="p-4 font-light text-[#aba9bb]">{row.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Conclusion */}
              <div className="glass-card p-6 border-t-2 border-t-[#aba9bb]/30">
                <h3 className="font-display text-xl text-[#e9e6f9] mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#aba9bb]" />
                  <span>📌 Conclusion</span>
                </h3>
                <div className="text-sm text-[#d4d0ea]/95 leading-relaxed space-y-4 font-light italic">
                  {report.conclusion?.split("\n\n").map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>

            </div>

            {/* Right/Sidebar Column - Span 1 */}
            <div className="flex flex-col gap-6">

              {/* Key Insights */}
              <div className="glass-card p-6 border-t-2 border-t-amber-500/60">
                <h3 className="font-display text-lg text-[#e9e6f9] mb-5 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>💡 Key Insights</span>
                </h3>
                <ul className="flex flex-col gap-3">
                  {report.key_insights?.map((insight, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-[#d4d0ea] bg-[#121220]/40 p-3.5 rounded-xl border border-white/5 hover:border-amber-500/10 transition-all font-light">
                      <span className="font-mono text-xs text-amber-400 shrink-0 mt-0.5 font-bold">
                        0{idx + 1}
                      </span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risks & Limitations */}
              <div className="glass-card p-6 border-t-2 border-t-red-500/60">
                <h3 className="font-display text-lg text-[#e9e6f9] mb-5 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>⚠ Risks / Limitations</span>
                </h3>
                <ul className="flex flex-col gap-3">
                  {report.risks_limitations?.map((risk, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-[#d4d0ea] bg-[#121220]/40 p-3.5 rounded-xl border border-white/5 hover:border-red-500/10 transition-all font-light">
                      <span className="text-red-400 font-bold shrink-0 mt-0.5">!</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div className="glass-card p-6 border-t-2 border-t-emerald-500/60">
                <h3 className="font-display text-lg text-[#e9e6f9] mb-5 flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-emerald-400" />
                  <span>🚀 Recommendations</span>
                </h3>
                <ul className="flex flex-col gap-4">
                  {report.recommendations?.map((rec, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-[#d4d0ea] font-light">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="mt-0.5 leading-relaxed">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default Upload;