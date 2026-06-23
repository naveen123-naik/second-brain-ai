import { useState } from "react";
import API from "../api/api";
import { Mail, Send, Activity, Clock } from "lucide-react";

function Email() {
  const [to, setTo] = useState("test@gmail.com");
  const [subject, setSubject] = useState("Neural Node Summary");
  const [body, setBody] = useState("The archivist has extracted the following insights:\n1. ...\n2. ...");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const sendEmail = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await API.post("/email/send", { to, subject, body });
      setMsg(res.data.message || "Dispatch confirmed.");
    } catch (err) {
      setMsg("SYS_ERR: Dispatch failed.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto">
      
      <div className="mb-8">
        <h1 className="font-display text-4xl text-[#e9e6f9] mb-2 tracking-tight">External Triage</h1>
        <p className="text-[#aba9bb]">Route neural architecture summaries and alerts to external comm channels.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Composer Form */}
        <div className="lg:col-span-2 glass-card p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <Mail className="w-5 h-5 text-[#00affe]" />
            <h3 className="font-display text-lg tracking-widest text-[#e9e6f9]">Dispatch Composer</h3>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono tracking-widest text-[#aba9bb] uppercase">Target Vector (To)</label>
            <input 
              value={to} onChange={(e)=>setTo(e.target.value)}
              className="bg-[#121220] border border-white/10 text-[#e9e6f9] p-3 rounded-lg focus:outline-none focus:border-[#00affe]/50 font-sans"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono tracking-widest text-[#aba9bb] uppercase">Subject Stream</label>
            <input 
              value={subject} onChange={(e)=>setSubject(e.target.value)}
              className="bg-[#121220] border border-white/10 text-[#e9e6f9] p-3 rounded-lg focus:outline-none focus:border-[#00affe]/50 font-sans"
            />
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <label className="text-xs font-mono tracking-widest text-[#aba9bb] uppercase">Payload Body</label>
            <textarea 
              value={body} onChange={(e)=>setBody(e.target.value)}
              className="bg-[#121220] border border-white/10 text-[#e9e6f9] p-3 rounded-lg focus:outline-none focus:border-[#00affe]/50 font-sans min-h-[200px] flex-1 resize-y"
            />
          </div>

          <button 
            onClick={sendEmail} disabled={loading}
            className="self-end flex items-center gap-2 bg-primary-gradient px-8 py-3 rounded-lg text-black font-semibold tracking-wide hover:shadow-glow-primary transition-all disabled:opacity-50"
          >
            {loading ? <Clock className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {loading ? "TRANSMITTING..." : "DISPATCH"}
          </button>
        </div>

        {/* Status panel */}
        <div className="glass-card p-6 flex flex-col gap-4">
           <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-[#e966ff]" />
            <h3 className="font-display tracking-widest text-sm text-[#e9e6f9]">SMTP RELAY STATUS</h3>
          </div>
          
          <div className="flex flex-col gap-3 font-mono text-xs text-[#aba9bb]">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span>Relay Node:</span>
              <span className="text-[#00affe]">smtp.gmail.com:587</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span>Authentication:</span>
              <span className="text-[#b6a0ff]">TLS ACTIVE</span>
            </div>
          </div>

          {msg && (
            <div className={`mt-4 p-4 rounded-lg border ${msg.includes("ERR") ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-[#00affe]/10 border-[#00affe]/50 text-[#00affe]'}`}>
              <p className="font-mono text-sm tracking-wide">{msg}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Email;