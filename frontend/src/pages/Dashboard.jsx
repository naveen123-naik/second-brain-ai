import { useState, useRef, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import API from "../api/api";
import { Sparkles, MessageSquare, UploadCloud, CheckSquare, Calendar, Plus, Command, Send, Bot, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import Upload from "./Upload";
import CalendarView from "./Calendar";

function Dashboard() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState("home"); // home, chat, upload, email, calendar
  const inputRef = useRef(null);
  const { addQuery, restoreTarget, clearRestore, chatId } = useOutletContext() || {};

  // Restore a previous session when user clicks history in sidebar
  useEffect(() => {
    if (restoreTarget) {
      setMessages([
        { role: 'user', text: restoreTarget.question },
        { role: 'assistant', text: restoreTarget.answer }
      ]);
      setActiveView("chat");
      clearRestore?.();
    }
  }, [restoreTarget, clearRestore]);

  useEffect(() => {
    if (chatId) {
      setMessages([]);
      setActiveView("home");
    }
  }, [chatId]);

  const askAI = async () => {
    if (!question) return;
    
    const userQ = question;
    setQuestion("");
    setMessages(prev => [...prev, { role: "user", text: userQ }]);

    setLoading(true);
    setActiveView("chat");
    const startTime = Date.now();
    try {
      const res = await API.post("/chat", { question: userQ });
      const aiAnswer = res.data.answer || "No response received.";

      // Enforce minimum 4 seconds loading delay
      const elapsed = Date.now() - startTime;
      const remaining = 4000 - elapsed;
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }

      setMessages(prev => [...prev, { role: "assistant", text: aiAnswer }]);
      // Save the full Q&A pair to history
      addQuery?.(userQ, aiAnswer);
    } catch (err) {
      console.error(err);
      // Guarantee minimum loading visual duration on error
      const elapsed = Date.now() - startTime;
      const remaining = 4000 - elapsed;
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }
      const errMsg = "ERROR: NEURAL_LINK_FAILED";
      setMessages(prev => [...prev, { role: "assistant", text: errMsg }]);
      addQuery?.(userQ, errMsg);
    }
    setLoading(false);
  };


  const actionCards = [
    { title: "Ask a Question", subtitle: "Query your archived data", icon: MessageSquare, id: "chat" },
    { title: "Upload Context", subtitle: "Add documents & files", icon: UploadCloud, id: "upload" },
    { title: "Explore Timeline", subtitle: "Browse historical data", icon: Calendar, id: "calendar" },
  ];

  const handleCardClick = (id) => {
    if (id === "chat") {
      inputRef.current?.focus();
    } else {
      setActiveView(id);
    }
  };

  const renderInnerContent = () => {
    if (activeView === "upload") return <Upload />;
    if (activeView === "calendar") return <CalendarView />;
    
    if (activeView === "chat") {
      return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 w-full pt-8 h-[60vh] overflow-y-auto pr-4 scroll-smooth">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex items-start gap-4 ${msg.role === 'user' ? 'self-end flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-gradient-to-tr from-[#7a5af8] to-[#b6a0ff]' : 'bg-[#13111C] border border-[#2A2A35]'}`}>
                {msg.role === 'assistant' && <Bot className="w-5 h-5 text-[#a882ff]" />}
              </div>
              <div className={`px-6 py-5 rounded-2xl ${msg.role === 'user' ? 'bg-[#1A162B] border border-[#a882ff]/20 rounded-tr-sm text-white/90' : 'bg-[#13111C] border border-[#2A2A35] rounded-tl-sm text-white/80 leading-relaxed min-w-[200px]'}`}>
                {msg.role === 'assistant' ? (
                  <div className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex items-start gap-4 animate-in fade-in duration-300">
              <div className="w-10 h-10 rounded-full border border-[#2A2A35] bg-black flex items-center justify-center flex-shrink-0 overflow-hidden shadow-glow-primary">
                <video
                  src={`${import.meta.env.BASE_URL}logo.mp4`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-110"
                />
              </div>
              <div className="bg-[#13111C] border border-[#2A2A35] px-6 py-5 rounded-2xl rounded-tl-sm text-white/80 leading-relaxed min-w-[220px] flex flex-col gap-2 shadow-ambient">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#a882ff] animate-pulse shadow-[0_0_6px_#a882ff]"></div>
                  <span className="text-[10px] text-[#a882ff] font-mono tracking-wider uppercase">Processing query across neural nodes...</span>
                </div>
                <div className="flex items-center gap-1.5 pl-3.5">
                  <div className="w-2 h-2 rounded-full bg-[#a882ff] animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-[#a882ff]/60 animate-bounce delay-100"></div>
                  <div className="w-2 h-2 rounded-full bg-[#a882ff]/30 animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Default home
    return (
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mt-[8vh]">
        <div className="w-20 h-20 rounded-full border border-[#a882ff]/30 bg-black flex items-center justify-center shadow-[0_0_20px_rgba(168,130,255,0.2)] mb-8 overflow-hidden">
          <video
            src={`${import.meta.env.BASE_URL}logo.mp4`}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover scale-110"
          />
        </div>
        
        <h1 className="text-4xl md:text-[44px] font-bold text-center leading-tight mb-4 tracking-wide text-white">
          Hello! How may I access <br/> the <span className="text-[#a882ff]">archives</span> for you today?
        </h1>
        
        <p className="text-[#aba9bb] text-lg mb-12 tracking-wide font-light">
          Your neural link is active. Ask me anything or explore your data.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {actionCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div 
                key={idx} 
                onClick={() => handleCardClick(card.id)}
                className="bg-[#13111C] border border-[#2A2A35] rounded-2xl p-5 flex flex-col gap-3 hover:border-[#a882ff]/40 hover:bg-[#1A162B] transition-all cursor-pointer group"
              >
                <Icon className="w-5 h-5 text-[#4D82E5] group-hover:text-[#a882ff] transition-colors" />
                <div>
                  <h3 className="text-white/90 font-semibold text-[15px] mb-1">{card.title}</h3>
                  <p className="text-white/40 text-xs tracking-wide">{card.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full justify-between items-center relative py-10">
      
      {/* Dynamic Content Area */}
      {renderInnerContent()}

      {/* Floating Prompt Bar at bottom */}
      <div className="w-full max-w-5xl mt-auto z-20 pt-8">
        <div className="relative w-full rounded-[1.75rem] border border-white/10 bg-[#0E0C15] p-2 flex items-center shadow-2xl">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#b6a0ff]/20 to-transparent rounded-[1.75rem] blur opacity-30 -z-10 pointer-events-none"></div>
          
          <div className="flex-1 flex items-center bg-[#15131F] border border-white/5 rounded-3xl p-1.5 pl-3 focus-within:border-[#a882ff]/30 focus-within:shadow-[0_0_15px_rgba(168,130,255,0.1)] transition-all">
            <button 
              onClick={() => setActiveView("home")}
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors mr-3"
              title="Return Home"
            >
              <Plus className={`w-5 h-5 text-white/70 transition-transform ${activeView !== 'home' ? 'rotate-45' : ''}`} />
            </button>
            
            <input
              ref={inputRef}
              className="flex-1 bg-transparent text-white/90 placeholder:text-white/30 text-lg outline-none font-light py-2 min-w-10"
              placeholder="Transmit prompt..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && askAI()}
            />
            
            {question && (
              <button 
                onClick={() => { setQuestion(""); inputRef.current?.focus(); }}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors mr-2"
                title="Clear prompt"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            
            <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-[#0B0A10] text-white/30 mr-3">
              <Command className="w-3.5 h-3.5" />
              <span className="text-xs font-mono">↵</span>
            </div>
            
            <button
              onClick={askAI}
              disabled={loading || !question}
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-2xl bg-[#a882ff] hover:bg-[#b6a0ff] hover:shadow-[0_0_15px_rgba(168,130,255,0.4)] disabled:opacity-50 transition-all text-white"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
      
    </div>
  );
}

export default Dashboard;