import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  UploadCloud,
  CheckSquare,
  Calendar,
  Mic,
  Settings,
  HelpCircle,
  Network,
  ShieldAlert,
  Trash2,
  MoreVertical
} from "lucide-react";

function Sidebar({ chatHistory = [], restoreSession, startNewChat, onDeleteHistoryItem }) {
  const location = useLocation();
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (openMenuId !== null) {
        if (!e.target.closest(".sidebar-menu-trigger")) {
          setOpenMenuId(null);
        }
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [openMenuId]);

  const primaryLinks = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Neural Chat", path: "/chat", icon: MessageSquare },
    { name: "Upload Context", path: "/upload", icon: UploadCloud },
    { name: "Triage", path: "/email", icon: CheckSquare },
    { name: "Timeline", path: "/calendar", icon: Calendar },
    { name: "Voice Sync", path: "/voice", icon: Mic },
    { name: "Security & Admin", path: "/admin", icon: ShieldAlert },
  ];

  const secondaryLinks = [
    { name: "Settings", path: "/settings", icon: Settings },
    { name: "Help & Docs", path: "/help", icon: HelpCircle },
  ];

  return (
    <div className="w-64 h-screen bg-[#0B0A10] ghost-border-r relative flex flex-col pt-8 pb-6 z-50">
      <div className="px-6 mb-10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full overflow-hidden border border-[#b6a0ff]/20 shadow-[0_0_12px_rgba(182,160,255,0.3)] bg-black/40 flex items-center justify-center flex-shrink-0">
          <video 
            src={`${import.meta.env.BASE_URL}logo.mp4`} 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="w-full h-full object-cover scale-110"
          />
        </div>
        <h1 className="font-display font-bold text-xl tracking-wider text-white">
          ARCHIVIST
        </h1>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-3 mt-4 overflow-y-auto hidden-scrollbar">
        {primaryLinks.map((link) => {
          const isActive = location.pathname === link.path;
          const Icon = link.icon;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`relative flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group flex-shrink-0
                ${isActive ? 'bg-[#1E192E] text-white' : 'text-white/60 hover:text-white hover:bg-white/[0.02]'}
              `}
            >
              {isActive && (
                <div className="absolute left-0 top-1/4 h-1/2 w-[3px] rounded-r-full bg-[#9b6dff] shadow-[0_0_10px_#9b6dff]"></div>
              )}
              <Icon 
                className={`w-5 h-5 ${isActive ? 'text-[#a882ff]' : 'group-hover:text-white/80'}`} 
              />
              <span className="font-medium tracking-wide text-sm">
                {link.name}
              </span>
            </Link>
          );
        })}

        <button
          onClick={startNewChat}
          className="mt-4 flex items-center gap-3 px-4 py-2.5 mx-2 bg-[#a882ff]/10 border border-[#a882ff]/30 text-[#c4a8ff] rounded-xl hover:bg-[#a882ff]/20 hover:border-[#a882ff]/50 transition-all shadow-[0_0_15px_rgba(168,130,255,0.1)] group flex-shrink-0"
        >
          <div className="w-5 h-5 rounded flex items-center justify-center bg-[#a882ff]/20 group-hover:bg-[#a882ff]/40 transition-colors">
            <span className="text-lg font-light leading-none">+</span>
          </div>
          <span className="font-semibold tracking-wide text-sm">New Chat</span>
        </button>

        {/* Recent Transmits history */}
        {chatHistory.length > 0 && (
          <div className="mt-6 px-2">
            <h4 className="text-[10px] font-mono tracking-widest text-white/40 uppercase mb-3 px-2">Recent Transmits</h4>
            <div className="flex flex-col gap-0.5">
              {chatHistory.map((entry, i) => (
                <div
                  key={entry.id || i}
                  className="w-full text-white/60 text-xs hover:text-white transition-colors hover:bg-white/[0.04] px-2 py-2 rounded-lg flex items-center justify-between border border-transparent hover:border-white/5 group relative"
                >
                  <button
                    onClick={() => restoreSession && restoreSession(entry)}
                    className="flex-1 text-left flex items-center gap-3 truncate cursor-pointer bg-transparent border-none text-inherit p-0"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#a882ff] shrink-0 group-hover:text-[#c4a8ff] transition-colors" />
                    <span className="truncate pr-8">{entry.question}</span>
                  </button>
                  {entry.id && onDeleteHistoryItem && (
                    <div className={`absolute right-2 top-1/2 -translate-y-1/2 ${openMenuId === entry.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity z-20 sidebar-menu-trigger`}>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === entry.id ? null : entry.id);
                          }}
                          className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white cursor-pointer"
                          title="Options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        
                        {openMenuId === entry.id && (
                          <div className="absolute right-0 mt-1 w-28 rounded-lg bg-[#13111C]/95 backdrop-blur-md border border-white/10 shadow-2xl py-1 z-30">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteHistoryItem(entry.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-white/5 hover:text-red-300 transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 mb-4 px-4 w-full flex-shrink-0">
          <div className="h-[1px] w-full bg-white/5"></div>
        </div>

        {secondaryLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.path}
              to={link.path}
              className="flex items-center gap-4 px-4 py-3 flex-shrink-0 rounded-xl transition-all duration-300 text-white/60 hover:text-white hover:bg-white/[0.02] group"
            >
              <Icon className="w-4 h-4 group-hover:text-white/80" />
              <span className="font-medium tracking-wide text-sm">
                {link.name}
              </span>
            </Link>
          );
        })}
      </nav>
      
      <div className="px-4 mt-auto pt-4 flex-shrink-0">
        <div className="w-full bg-[#13111C] border border-white/5 rounded-xl p-3 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]"></div>
            <span className="text-xs font-semibold text-white/90">Neural Link</span>
          </div>
          <span className="text-[10px] text-[#22c55e] ml-4 font-mono tracking-wider uppercase">Established</span>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;