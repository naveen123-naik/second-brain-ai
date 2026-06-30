import { useState, useRef, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import API from "../api/api";
import { Sparkles, Send, User, DatabaseZap, X, MoreVertical, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function Chat() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Neural link established. How may I access the archives for you today?" }
  ]);
  const [loading, setLoading] = useState(false);
  const [openMenuIdx, setOpenMenuIdx] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const { addQuery, restoreTarget, clearRestore, chatId, refreshHistory } = useOutletContext();

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (openMenuIdx !== null) {
        if (!e.target.closest(".menu-trigger-container")) {
          setOpenMenuIdx(null);
        }
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [openMenuIdx]);

  const handleDeleteMessage = async (id) => {
    try {
      await API.delete(`/chat/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
      setOpenMenuIdx(null);
      if (refreshHistory) {
        refreshHistory();
      }
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  };

  const [prevRestoreTarget, setPrevRestoreTarget] = useState(null);
  if (restoreTarget !== prevRestoreTarget) {
    setPrevRestoreTarget(restoreTarget);
    if (restoreTarget) {
      setMessages([
        { role: 'user', text: restoreTarget.question },
        { role: 'assistant', text: restoreTarget.answer }
      ]);
      clearRestore();
    }
  }

  useEffect(() => {
    const loadConversation = async () => {
      try {
        const res = await API.get("/chat/history");
        const chatMsgs = [
          { role: "assistant", text: "Neural link established. How may I access the archives for you today?" }
        ];
        res.data.forEach(chat => {
          chatMsgs.push({ id: chat.id, role: "user", text: chat.question });
          chatMsgs.push({ id: chat.id, role: "assistant", text: chat.answer });
        });
        setMessages(chatMsgs);
      } catch (error) {
        console.error("Failed to load chat history", error);
      }
    };

    if (!restoreTarget) {
      loadConversation();
    }
  }, [chatId, restoreTarget]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const askAI = async () => {
    if (!question.trim()) return;

    const userQ = question;
    setQuestion("");
    setMessages(prev => [...prev, { role: "user", text: userQ }]);
    setLoading(true);
    const startTime = Date.now();

    try {
      const model = localStorage.getItem("ai_model") || "gpt-4o";
      const response_length = localStorage.getItem("response_length") || "medium";
      const creativityVal = localStorage.getItem("creativity");
      const creativity = creativityVal ? parseFloat(creativityVal) : 0.7;
      const language = localStorage.getItem("preferred_language") || "English";

      const res = await API.post("/chat", { 
        question: userQ,
        model,
        response_length,
        creativity,
        language
      });

      // Enforce minimum 4 seconds loading delay
      const elapsed = Date.now() - startTime;
      const remaining = 4000 - elapsed;
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }

      setMessages(prev => {
        const copy = [...prev];
        const lastUserMsgIdx = copy.map(m => m.role).lastIndexOf("user");
        if (lastUserMsgIdx !== -1) {
          copy[lastUserMsgIdx].id = res.data.id;
        }
        return [...copy, { id: res.data.id, role: "assistant", text: res.data.answer }];
      });
      if (addQuery) {
        addQuery(userQ, res.data.answer);
      }
    } catch (error) {
      console.error(error);
      // Guarantee minimum loading visual duration on error
      const elapsed = Date.now() - startTime;
      const remaining = 4000 - elapsed;
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }
      setMessages(prev => [...prev, { role: "assistant", text: "ERROR: Connection to Neural Context failed." }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-6rem)]">

      {/* Main Chat Area */}
      <div className="flex-1 glass-card flex flex-col overflow-hidden relative">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00affe] opacity-[0.03] blur-[100px] pointer-events-none rounded-full"></div>

        {/* Chat History */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 z-10 scroll-smooth">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'} group`}>

              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${msg.role === 'user' ? 'bg-[#1e1e2f] border-white/10' : 'bg-[#121220] border-[#b6a0ff]/30 shadow-glow-primary'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-[#aba9bb]" /> : <Sparkles className="w-5 h-5 text-[#b6a0ff]" />}
              </div>

              <div className="relative flex items-center">
                <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-[#1e1e2f] text-[#e9e6f9] rounded-tr-sm' : 'glass-card border-l-[#b6a0ff]/50 rounded-tl-sm'}`}>
                  {msg.role === 'assistant' ? (
                    <div className="markdown-body text-sm text-[#e9e6f9] font-light leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="leading-relaxed">
                      {msg.text}
                    </p>
                  )}
                </div>

                {/* Three dots option beside the message */}
                {msg.id && (
                  <div className={`absolute top-1/2 -translate-y-1/2 ${msg.role === 'user' ? '-left-8' : '-right-8'} ${openMenuIdx === idx ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity z-20 menu-trigger-container`}>
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuIdx(openMenuIdx === idx ? null : idx)}
                        className="p-1.5 rounded-full hover:bg-white/10 text-[#aba9bb] hover:text-white transition-colors cursor-pointer"
                        title="Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {openMenuIdx === idx && (
                        <div 
                          className={`absolute ${msg.role === 'user' ? 'left-0' : 'right-0'} mt-1 w-28 rounded-lg bg-[#13111C]/95 backdrop-blur-md border border-white/10 shadow-2xl py-1 z-30`}
                        >
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-white/5 hover:text-red-300 transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>
          ))}

          {loading && (
            <div className="flex gap-4 max-w-[85%] self-start animate-in fade-in duration-300">
              <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center border bg-black border-[#b6a0ff]/20 shadow-glow-primary overflow-hidden flex-shrink-0">
                <video
                  src={`${import.meta.env.BASE_URL}logo.mp4`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-110"
                />
              </div>
              <div className="p-4 rounded-2xl glass-card border-l-[#b6a0ff]/50 rounded-tl-sm flex flex-col gap-2 min-w-[220px]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#b6a0ff] animate-pulse shadow-[0_0_6px_#b6a0ff]"></div>
                  <span className="text-[10px] text-[#b6a0ff] font-mono tracking-wider uppercase">DECRYPTING ARCHIVES...</span>
                </div>
                <div className="flex items-center gap-1.5 pl-3.5">
                  <div className="w-2 h-2 rounded-full bg-[#b6a0ff] animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-[#b6a0ff]/60 animate-bounce delay-100"></div>
                  <div className="w-2 h-2 rounded-full bg-[#b6a0ff]/30 animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-6 border-t border-white/5 bg-[#0d0d1a]/50 backdrop-blur-md z-10">
          <div className="relative">
            <input
              ref={inputRef}
              className="w-full bg-[#121220] border border-white/10 text-[#e9e6f9] p-4 pl-6 pr-24 rounded-full focus:outline-none focus:border-[#b6a0ff]/50 focus:shadow-glow-primary transition-all duration-300 font-sans"
              placeholder="Transmit prompt..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && askAI()}
            />
            {question && (
              <button
                onClick={() => { setQuestion(""); inputRef.current?.focus(); }}
                className="absolute right-14 top-2.5 p-2 rounded-full text-[#aba9bb] hover:text-white hover:bg-white/10 transition-colors"
                title="Clear prompt"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={askAI}
              className="absolute right-3 top-2.5 p-2 rounded-full hover:bg-white/10 text-[#00affe] transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Neural Context Sidebar */}
      <div className="w-80 hidden lg:flex flex-col gap-4">
        <h3 className="font-display tracking-widest text-sm text-[#aba9bb] uppercase mb-2 flex items-center gap-2">
          <DatabaseZap className="w-4 h-4 text-[#e966ff]" />
          Neural Context
        </h3>

        <div className="glass-card flex-1 p-5 border-t border-t-[#e966ff]/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-[#00affe] animate-pulse shadow-[0_0_8px_#00affe]"></div>
            <span className="text-xs font-mono text-[#e9e6f9]">ACTIVE STREAM</span>
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-[#121220]/80 rounded border border-white/5">
              <span className="text-xs text-[#aba9bb] font-mono">source_doc_11A.pdf</span>
              <p className="text-sm mt-1 text-on-surface line-clamp-2">"The architecture relies on high-dimensional vectors..."</p>
            </div>
            <div className="p-3 bg-[#121220]/80 rounded border border-white/5">
              <span className="text-xs text-[#aba9bb] font-mono">voice_memo_tuesday.wav</span>
              <p className="text-sm mt-1 text-on-surface line-clamp-2">"...make sure we discuss the asymmetrical layout..."</p>
            </div>
          </div>

          <div className="absolute bottom-5 left-5 right-5">
            <div className="text-center p-3 rounded bg-[#primary]/10 border border-[#b6a0ff]/20 text-[#b6a0ff] text-xs font-mono tracking-widest">
              AWAITING INSIGHT
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default Chat;