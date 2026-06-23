import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { askAI } from "../api/chatApi"

function ChatBox() {

  const [question, setQuestion] = useState("")
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!question.trim()) return;
    
    setLoading(true)
    try {
      const res = await askAI(question)

      setMessages([
        ...messages,
        { q: question, a: res.data.answer }
      ])

      setQuestion("")
    } catch (error) {
      console.error("Chat error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4">

      <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-2">
        {messages.map((m, i) => (
          <div key={i} className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* User Message */}
            <div className="self-end max-w-[80%] bg-surface-container-high px-4 py-3 rounded-2xl rounded-tr-none border border-white/5 shadow-ambient">
              <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-1">You</p>
              <p className="text-on-surface">{m.q}</p>
            </div>

            {/* AI Message */}
            <div className="self-start w-full glass-card p-6 border border-white/10 shadow-glow-primary">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary-gradient flex items-center justify-center text-white font-bold shadow-glow-primary">
                  A
                </div>
                <p className="text-primary font-display font-bold tracking-tight">ARCHIVIST AI</p>
              </div>

              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {m.a}
                </ReactMarkdown>
              </div>
            </div>

          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-3 animate-pulse px-6 py-4">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <div className="w-2 h-2 rounded-full bg-primary/60"></div>
            <div className="w-2 h-2 rounded-full bg-primary/30"></div>
            <span className="text-on-surface-variant text-sm font-medium italic">Archivist is thinking...</span>
          </div>
        )}
      </div>

      <div className="relative group">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage()}
          className="ask-ai-input w-full py-4 pl-6 pr-16 text-on-surface focus:outline-none transition-all placeholder:text-on-surface-variant/50"
          placeholder="Type your question here..."
          disabled={loading}
        />

        <button
          onClick={sendMessage}
          disabled={loading || !question.trim()}
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-glow-primary ${
            loading || !question.trim() 
            ? 'bg-surface-container-highest text-on-surface-variant opacity-50 cursor-not-allowed' 
            : 'bg-primary-gradient text-white hover:scale-105 active:scale-95 cursor-pointer'
          }`}
        >
          {loading ? (
             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          )}
        </button>
      </div>

    </div>
  )
}

export default ChatBox