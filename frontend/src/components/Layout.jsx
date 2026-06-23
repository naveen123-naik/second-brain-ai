import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { ChevronsLeft, Check } from "lucide-react";
import API from "../api/api";

function Layout() {
  // Each entry: { question: string, answer: string }
  const [chatHistory, setChatHistory] = useState([]);
  // The session to restore when sidebar item is clicked: { question, answer } | null
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [chatId, setChatId] = useState(0);

  // Fetch chat history from database on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await API.get("/chat/history");
        // The API returns chats in ascending order, reverse for the sidebar (recent first)
        const reversedHistory = [...res.data].reverse().slice(0, 8);
        setChatHistory(reversedHistory);
      } catch (err) {
        console.error("Failed to fetch chat history from DB", err);
      }
    };
    fetchHistory();
  }, [chatId]);

  const addQuery = (question, answer) => {
    setChatHistory(prev => {
      // Remove duplicate question if it already exists, then prepend
      const filtered = prev.filter(e => e.question !== question);
      return [{ question, answer }, ...filtered].slice(0, 8); // keep last 8
    });
  };

  const navigate = useNavigate();
  const profilePic = localStorage.getItem("profile_pic") || `https://api.dicebear.com/7.x/bottts/svg?seed=${localStorage.getItem("profile_name") || "Archivist"}`;

  const restoreSession = (entry) => {
    setRestoreTarget(entry);
    navigate('/chat');
  };

  const startNewChat = async () => {
    try {
      await API.post("/chat/new");
    } catch (err) {
      console.error("Failed to clear backend chat memory", err);
    }
    // Increment chatId so child components know to clear their screens
    setChatId(prev => prev + 1);
    setChatHistory([]);
  };

  return (
    <div className="flex bg-[#0b0a10] min-h-screen text-[#e9e6f9] font-sans">
      <Sidebar chatHistory={chatHistory} restoreSession={restoreSession} startNewChat={startNewChat} />
      <div className="flex-1 flex flex-col relative overflow-hidden h-screen">
        {/* Ambient Dot Pattern Background */}
        <div className="absolute top-0 left-0 w-full h-full dot-pattern opacity-50 pointer-events-none -z-20"></div>

        {/* Ambient Background Glows */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-20%] left-[20%] w-[40%] h-[40%] rounded-full bg-[#b6a0ff] opacity-[0.03] blur-[100px]"></div>
        </div>

        {/* Top Header Bar */}
        <header className="w-full flex items-center justify-between p-6 z-10">
          <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition-colors group">
            <ChevronsLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-[#13111C] border border-white/5 px-4 py-2 rounded-full shadow-lg">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
              <span className="text-sm font-medium tracking-wide text-white/90">Neural link established</span>
              <div className="w-5 h-5 rounded-full border border-white/10 flex items-center justify-center bg-white/5 text-white/40">
                <Check className="w-3 h-3" />
              </div>
            </div>

            <div className="h-6 w-[1px] bg-white/10"></div>

            <img
              onClick={() => navigate("/settings")}
              src={profilePic}
              alt="avatar"
              className="w-10 h-10 rounded-full bg-[#1b1929] border border-white/10 p-0.5 cursor-pointer opacity-90 hover:opacity-100 transition-opacity shadow-[0_0_15px_rgba(182,160,255,0.4)]"
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 lg:px-12 pb-12 z-10 relative flex flex-col">
          <Outlet context={{ addQuery, restoreTarget, clearRestore: () => setRestoreTarget(null), chatId }} />
        </main>
      </div>
    </div>
  );
}

export default Layout;