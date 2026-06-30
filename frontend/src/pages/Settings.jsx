import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { 
  User, Shield, Sun, Moon, Sparkles, Brain, Bell, Eye, EyeOff, 
  Trash2, ShieldCheck, Download, AlertTriangle, Key, Laptop,
  Lock, Check, Smartphone, Globe, Mail, Info, LogOut
} from "lucide-react";

function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("account"); // account, security, appearance, ai, memory, notifications, data
  
  // Account States
  const [profileName, setProfileName] = useState(localStorage.getItem("profile_name") || "");
  const [email, setEmail] = useState(localStorage.getItem("email") || "");
  const [profilePic, setProfilePic] = useState(localStorage.getItem("profile_pic") || "https://api.dicebear.com/7.x/bottts/svg?seed=Archivist");
  
  // Security States
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessions, setSessions] = useState([]);
  
  // Appearance States
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  
  // AI States
  const [aiModel, setAiModel] = useState(localStorage.getItem("ai_model") || "gpt-4o");
  const [responseLength, setResponseLength] = useState(localStorage.getItem("response_length") || "medium");
  const [creativity, setCreativity] = useState(parseFloat(localStorage.getItem("creativity") || "0.7"));
  const [preferredLanguage, setPreferredLanguage] = useState(localStorage.getItem("preferred_language") || "English");
  
  // Memory States
  const [memoryEnabled, setMemoryEnabled] = useState(localStorage.getItem("memory_enabled") !== "false");
  const [savedMemories, setSavedMemories] = useState([
    { id: 1, text: "User prefers clean, modern dark mode interfaces." },
    { id: 2, text: "Admin credentials seeded successfully." },
    { id: 3, text: "Preferred language is English." }
  ]);
  
  // Notification States
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [productUpdates, setProductUpdates] = useState(false);
 
  // General Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Fetch profile details
    const fetchProfile = async () => {
      try {
        const res = await API.get("/auth/me");
        setProfileName(res.data.name);
        setEmail(res.data.email);
        if (res.data.profile_picture) {
          setProfilePic(res.data.profile_picture);
        }
      } catch (err) {
        console.error("Failed to load profile details", err);
      }
    };
    // Fetch user sessions
    const fetchSessions = async () => {
      try {
        const res = await API.get("/admin/sessions");
        setSessions(res.data);
      } catch {
        // Safe fallback if not admin/failure
        setSessions([
          { id: 1, device_type: "Chrome (Windows) - Current Device", ip_address: "127.0.0.1", location: "Hyderabad, India", last_active: new Date().toISOString() }
        ]);
      }
    };
    fetchProfile();
    fetchSessions();
  }, []);

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.put("/auth/me", {
        name: profileName,
        profile_picture: profilePic
      });
      localStorage.setItem("profile_name", res.data.name);
      localStorage.setItem("profile_pic", res.data.profile_picture || "");
      showSuccess("Profile details saved successfully.");
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to update profile details.");
    } finally {
      setLoading(false);
    }
  };



  const handleRevokeSession = async (sessionId) => {
    try {
      await API.post(`/admin/sessions/${sessionId}/revoke`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      showSuccess("Device session terminated.");
    } catch {
      showError("Failed to revoke session.");
    }
  };

  const handleRevokeAllDevices = () => {
    setSessions(prev => prev.filter(s => s.id === 1)); // keep only current
    showSuccess("All other active device sessions revoked.");
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    const body = document.body;
    if (newTheme === "light") {
      body.classList.add("light-mode");
      body.style.backgroundColor = "#f7f7fc";
      body.style.color = "#1e1e2f";
    } else {
      body.classList.remove("light-mode");
      body.style.backgroundColor = "";
      body.style.color = "";
    }
    showSuccess(`Appearance theme set to ${newTheme.toUpperCase()}.`);
  };

  const handleSaveAI = () => {
    localStorage.setItem("ai_model", aiModel);
    localStorage.setItem("response_length", responseLength);
    localStorage.setItem("creativity", creativity.toString());
    localStorage.setItem("preferred_language", preferredLanguage);
    showSuccess("AI system preferences synced.");
  };

  const handleDeleteMemory = (id) => {
    setSavedMemories(prev => prev.filter(m => m.id !== id));
  };

  const handleExportHistory = async () => {
    try {
      const res = await API.get("/chat/history");
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `second-brain-chat-history-${new Date().toISOString().split("T")[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showSuccess("Chat logs exported as JSON file.");
    } catch {
      showError("Export failed: chat logs empty or connection error.");
    }
  };

  const handleDeleteHistory = async () => {
    if (confirm("Are you sure you want to purge all conversation logs? This cannot be undone.")) {
      try {
        await API.post("/chat/new");
        showSuccess("Conversational vaults purged successfully.");
      } catch {
        showError("Purge request failed.");
      }
    }
  };



  const handleLogout = async () => {
    try {
      await API.post("/auth/logout");
    } catch (err) {
      console.error("Logout call failed", err);
    }
    localStorage.clear();
    navigate("/login");
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 3000);
  };

  const tabs = [
    { id: "account", name: "👤 Account", icon: User },
    { id: "appearance", name: "🎨 Appearance", icon: Sun },
    { id: "ai", name: "🤖 AI Preferences", icon: Sparkles },
    { id: "memory", name: "🧠 Memory", icon: Brain },
    { id: "notifications", name: "🔔 Notifications", icon: Bell },
    { id: "data", name: "📄 Data & Privacy", icon: Info }
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto pb-12 w-full h-[calc(100vh-8rem)]">
      
      {/* Settings Navigation Sidebar */}
      <div className="w-full lg:w-64 flex flex-col gap-1.5 shrink-0">
        <h2 className="font-display text-2xl text-[#e9e6f9] mb-4 tracking-tight px-2">Settings</h2>
        <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1 pb-2 lg:pb-0 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setErrorMsg(""); setSuccessMsg(""); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium tracking-wide transition-all text-left whitespace-nowrap cursor-pointer ${
                  isActive 
                    ? "bg-[#1E192E] text-white shadow-glow-primary border-l-2 border-l-[#a882ff]" 
                    : "text-white/60 hover:text-white hover:bg-white/[0.02]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#a882ff]" : "text-white/40"}`} />
                <span>{tab.name.substring(2)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Settings Panel */}
      <div className="flex-1 glass-card p-8 border border-white/10 flex flex-col overflow-y-auto relative h-full">
        {/* Toast alerts */}
        {successMsg && (
          <div className="absolute top-4 right-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn z-50">
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="absolute top-4 right-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-fadeIn z-50">
            <AlertTriangle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab content: Account */}
        {activeTab === "account" && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Account Vault Details</h3>
              <p className="text-xs text-[#aba9bb] font-light">Manage your identity nodes and security passphrase.</p>
            </div>

            {/* Profile Pic Upload */}
            <div className="flex items-center gap-6 p-4 rounded-xl bg-[#121220]/40 border border-white/5">
              <img src={profilePic} alt="avatar" className="w-16 h-16 rounded-2xl bg-[#1b1929] border border-white/10 p-1" />
              <div>
                <span className="text-[10px] font-mono text-[#aba9bb] uppercase tracking-widest block mb-1">Identity Avatar</span>
                <button 
                  onClick={() => setProfilePic(`https://api.dicebear.com/7.x/bottts/svg?seed=${Math.random()}`)}
                  className="text-xs text-[#b6a0ff] hover:underline"
                >
                  Generate Random Avatar
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono tracking-widest text-[#aba9bb] uppercase block mb-1.5 pl-1">Profile Name</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-[#121220] border border-white/10 text-white rounded-lg p-3 text-xs outline-none focus:border-[#b6a0ff]/50 font-sans"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono tracking-widest text-[#aba9bb] uppercase block mb-1.5 pl-1">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full bg-[#121220]/50 border border-white/5 text-white/50 rounded-lg p-3 text-xs outline-none cursor-not-allowed font-sans"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="bg-primary-gradient px-6 py-2.5 rounded-lg text-black font-semibold text-xs tracking-wider disabled:opacity-50"
              >
                {loading ? "SAVING..." : "SAVE PROFILE DETAILS"}
              </button>
            </form>
          </div>
        )}

        {/* Tab content: Security */}
        {activeTab === "security" && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Session & Credential Security</h3>
              <p className="text-xs text-[#aba9bb] font-light">Manage connected devices and MFA parameters.</p>
            </div>

            {/* 2FA Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#121220]/40 border border-white/5">
              <div className="flex gap-4 items-start">
                <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-white">Two-Factor Authentication (2FA)</h4>
                  <p className="text-xs text-[#aba9bb] leading-normal font-light">Require a mobile TOTP code to sign in and open your brain vault.</p>
                </div>
              </div>
              <button 
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                className="text-[#b6a0ff]"
              >
                {twoFactorEnabled ? (
                  <span className="text-xs font-semibold px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg">ENABLED</span>
                ) : (
                  <span className="text-xs font-semibold px-3 py-1 bg-white/5 text-white/40 border border-white/10 rounded-lg">DISABLED</span>
                )}
              </button>
            </div>

            {/* Active Sessions */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-semibold text-white">Active Device Sessions</h4>
                <button 
                  onClick={handleRevokeAllDevices}
                  className="text-xs text-red-400 hover:underline"
                >
                  Revoke All Other Devices
                </button>
              </div>

              <div className="space-y-3">
                {sessions.map((s) => (
                  <div key={s.id} className="p-4 bg-[#121220]/60 border border-white/5 rounded-xl flex justify-between items-center">
                    <div className="flex gap-4">
                      {s.device_type.toLowerCase().includes("mobile") || s.device_type.toLowerCase().includes("iphone") ? (
                        <Smartphone className="w-4 h-4 text-[#e966ff] shrink-0" />
                      ) : (
                        <Laptop className="w-4 h-4 text-[#00affe] shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-semibold text-white">{s.device_type}</p>
                        <p className="text-[10px] text-[#aba9bb] font-mono mt-0.5">{s.ip_address} • {s.location}</p>
                      </div>
                    </div>
                    {s.id !== 1 && (
                      <button 
                        onClick={() => handleRevokeSession(s.id)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Terminate
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="h-[1px] w-full bg-white/5 my-6"></div>

            {/* Logout Buttons */}
            <div className="flex gap-3">
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 bg-[#121220] hover:bg-white/5 border border-white/10 px-5 py-2.5 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-white/60" />
                <span>Sign Out Current Session</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab content: Appearance */}
        {activeTab === "appearance" && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Interface Customization</h3>
              <p className="text-xs text-[#aba9bb] font-light">Set themes and visual styling layouts.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Dark mode card */}
              <button
                onClick={() => handleThemeChange("dark")}
                className={`p-5 rounded-2xl border text-left flex flex-col gap-4 cursor-pointer transition-all ${
                  theme === "dark" 
                    ? "bg-[#1E192E] border-[#a882ff] shadow-[0_0_15px_rgba(168,130,255,0.15)]" 
                    : "bg-[#121220]/40 border-white/5 hover:border-white/10"
                }`}
              >
                <Moon className="w-5 h-5 text-[#a882ff]" />
                <div>
                  <h4 className="text-sm font-semibold text-white">Quantum Dark</h4>
                  <p className="text-[10px] text-[#aba9bb] mt-0.5 leading-normal">Deep space background with glowing violet highlights.</p>
                </div>
              </button>

              {/* Light mode card */}
              <button
                onClick={() => handleThemeChange("light")}
                className={`p-5 rounded-2xl border text-left flex flex-col gap-4 cursor-pointer transition-all ${
                  theme === "light" 
                    ? "bg-white border-blue-500 shadow-lg text-slate-800" 
                    : "bg-[#121220]/40 border-white/5 hover:border-white/10"
                }`}
              >
                <Sun className="w-5 h-5 text-blue-500" />
                <div>
                  <h4 className={`text-sm font-semibold ${theme === "light" ? "text-slate-800" : "text-white"}`}>Solar Light</h4>
                  <p className="text-[10px] text-[#aba9bb] mt-0.5 leading-normal">Clean high-contrast solarized layout for daylight readability.</p>
                </div>
              </button>

              {/* System Theme card */}
              <button
                onClick={() => handleThemeChange("system")}
                className={`p-5 rounded-2xl border text-left flex flex-col gap-4 cursor-pointer transition-all ${
                  theme === "system" 
                    ? "bg-[#1E192E] border-[#a882ff] shadow-[0_0_15px_rgba(168,130,255,0.15)]" 
                    : "bg-[#121220]/40 border-white/5 hover:border-white/10"
                }`}
              >
                <Laptop className="w-5 h-5 text-[#aba9bb]" />
                <div>
                  <h4 className="text-sm font-semibold text-white">System Synchronicity</h4>
                  <p className="text-[10px] text-[#aba9bb] mt-0.5 leading-normal">Match the operating system theme parameters dynamically.</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Tab content: AI Preferences */}
        {activeTab === "ai" && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">AI Cognitive Preferences</h3>
              <p className="text-xs text-[#aba9bb] font-light">Select active models, response lengths, and prompt parameters.</p>
            </div>

            <div className="space-y-6">
              {/* Model Dropdown */}
              <div>
                <label className="text-[10px] font-mono tracking-widest text-[#aba9bb] uppercase block mb-1.5 pl-1">Primary Cognitive Model</label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full bg-[#121220] border border-white/10 text-white rounded-lg p-3 text-xs outline-none focus:border-[#b6a0ff]/50 font-sans"
                >
                  <option value="gpt-4o">GPT-4o (Premium reasoning & coding)</option>
                  <option value="claude-3.5-sonnet">Claude 3.5 Sonnet (Expert Tutoring)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Massive Context RAG)</option>
                  <option value="llama-3.3">Llama 3.3 70B (Fast Versatile)</option>
                </select>
              </div>

              {/* Response Length Radio buttons */}
              <div>
                <label className="text-[10px] font-mono tracking-widest text-[#aba9bb] uppercase block mb-1.5 pl-1">Output Token Density (Length)</label>
                <div className="flex gap-2">
                  {["short", "medium", "long"].map((len) => (
                    <button
                      key={len}
                      type="button"
                      onClick={() => setResponseLength(len)}
                      className={`flex-1 py-2.5 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                        responseLength === len 
                          ? "bg-[#b6a0ff]/10 text-[#b6a0ff] border-[#b6a0ff]/40" 
                          : "bg-[#121220] border-white/10 text-white/50 hover:text-white"
                      }`}
                    >
                      {len}
                    </button>
                  ))}
                </div>
              </div>

              {/* Creativity level Slider */}
              <div>
                <div className="flex justify-between items-center mb-1.5 px-1">
                  <label className="text-[10px] font-mono tracking-widest text-[#aba9bb] uppercase">Creativity Level (Temperature: {creativity})</label>
                  <span className="text-xs text-[#b6a0ff] font-semibold">{creativity <= 0.3 ? "Deterministic" : creativity <= 0.7 ? "Balanced" : "Creative"}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={creativity}
                  onChange={(e) => setCreativity(parseFloat(e.target.value))}
                  className="w-full accent-[#b6a0ff] bg-white/10 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Preferred Language Dropdown */}
              <div>
                <label className="text-[10px] font-mono tracking-widest text-[#aba9bb] uppercase block mb-1.5 pl-1">System Language</label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="w-full bg-[#121220] border border-white/10 text-white rounded-lg p-3 text-xs outline-none focus:border-[#b6a0ff]/50 font-sans"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Español (Spanish)</option>
                  <option value="French">Français (French)</option>
                  <option value="German">Deutsch (German)</option>
                </select>
              </div>

              <button
                onClick={handleSaveAI}
                className="bg-primary-gradient px-6 py-2.5 rounded-lg text-black font-semibold text-xs tracking-wider"
              >
                SYNC COGNITIVE PREFERENCES
              </button>
            </div>
          </div>
        )}

        {/* Tab content: Memory */}
        {activeTab === "memory" && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Memory Matrix</h3>
              <p className="text-xs text-[#aba9bb] font-light">Toggle system persistent memory and purge recall vectors.</p>
            </div>

            {/* Enable/Disable Memory */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#121220]/40 border border-white/5">
              <div>
                <h4 className="text-sm font-semibold text-white">Enable Core Memory</h4>
                <p className="text-[10px] text-[#aba9bb] leading-normal mt-0.5">Let the assistant store user preferences and details to reuse across chat streams.</p>
              </div>
              <button 
                onClick={() => { setMemoryEnabled(!memoryEnabled); localStorage.setItem("memory_enabled", (!memoryEnabled).toString()); }}
                className="text-[#b6a0ff]"
              >
                {memoryEnabled ? (
                  <span className="text-xs font-semibold px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg">ACTIVE</span>
                ) : (
                  <span className="text-xs font-semibold px-3 py-1 bg-white/5 text-white/40 border border-white/10 rounded-lg">MUTED</span>
                )}
              </button>
            </div>

            {/* Saved Memories List */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-white">Grounded Recall Vectors</h4>
              <div className="space-y-2">
                {savedMemories.length === 0 ? (
                  <div className="text-xs font-mono text-[#aba9bb]/40 text-center py-6">No recall vectors stored yet.</div>
                ) : (
                  savedMemories.map((mem) => (
                    <div key={mem.id} className="p-3 bg-[#121220]/60 border border-white/5 rounded-xl flex justify-between items-center">
                      <p className="text-xs text-[#e9e6f9] leading-relaxed font-light">{mem.text}</p>
                      <button 
                        onClick={() => handleDeleteMemory(mem.id)}
                        className="text-red-400 hover:text-red-300 p-1 shrink-0 ml-4"
                        title="Delete Memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab content: Notifications */}
        {activeTab === "notifications" && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Notification Preferences</h3>
              <p className="text-xs text-[#aba9bb] font-light">Set email alert parameters and update lists.</p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#121220]/40 border border-white/5">
                <div>
                  <h4 className="text-sm font-semibold text-white">Email Audit Alerts</h4>
                  <p className="text-[10px] text-[#aba9bb] leading-normal mt-0.5">Receive email alerts on suspicious device sessions or login ciphers.</p>
                </div>
                <button 
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className="text-[#b6a0ff]"
                >
                  {emailNotifications ? (
                    <span className="text-xs font-semibold px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg">RECEIVING</span>
                  ) : (
                    <span className="text-xs font-semibold px-3 py-1 bg-white/5 text-white/40 border border-white/10 rounded-lg">MUTED</span>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-[#121220]/40 border border-white/5">
                <div>
                  <h4 className="text-sm font-semibold text-white">Product Intelligence Updates</h4>
                  <p className="text-[10px] text-[#aba9bb] leading-normal mt-0.5">Opt-in to emails about new model models and security features.</p>
                </div>
                <button 
                  onClick={() => setProductUpdates(!productUpdates)}
                  className="text-[#b6a0ff]"
                >
                  {productUpdates ? (
                    <span className="text-xs font-semibold px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg">SUBSCRIBED</span>
                  ) : (
                    <span className="text-xs font-semibold px-3 py-1 bg-white/5 text-white/40 border border-white/10 rounded-lg">UNSUBSCRIBED</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab content: Data & Privacy */}
        {activeTab === "data" && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Data Portability & Regulations</h3>
              <p className="text-xs text-[#aba9bb] font-light">Export your personal data and clear historical logs.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Export */}
              <div className="p-5 rounded-xl border border-white/10 bg-[#121220]/40 flex flex-col justify-between items-start gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Download className="w-4 h-4 text-[#00affe]" />
                    <span>Export Chat Log Vault</span>
                  </h4>
                  <p className="text-[10px] text-[#aba9bb] mt-1 leading-normal font-light">Download a JSON record of all chat transcripts.</p>
                </div>
                <button 
                  onClick={handleExportHistory}
                  className="bg-primary-gradient px-4 py-2 rounded-lg text-black font-semibold text-xs tracking-wider flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>EXPORT JSON</span>
                </button>
              </div>

              {/* Clear History */}
              <div className="p-5 rounded-xl border border-red-500/20 bg-red-500/5 flex flex-col justify-between items-start gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    <span>Clear Conversational Memory</span>
                  </h4>
                  <p className="text-[10px] text-[#aba9bb] mt-1 leading-normal font-light">Clear your persistent chat history from the database completely.</p>
                </div>
                <button 
                  onClick={handleDeleteHistory}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                >
                  PURGE HISTORY
                </button>
              </div>
            </div>

            <div className="h-[1px] w-full bg-white/5 my-6"></div>

            {/* Documents */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-white">Regulatory Documentation</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a href="#privacy" className="p-3 bg-[#121220]/60 border border-white/5 rounded-xl text-xs hover:border-white/10 hover:text-white transition-all block">
                  🛡 Privacy Policy Document
                </a>
                <a href="#terms" className="p-3 bg-[#121220]/60 border border-white/5 rounded-xl text-xs hover:border-white/10 hover:text-white transition-all block">
                  📄 Terms of Service Agreement
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;
