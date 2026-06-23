import { useState, useEffect } from "react";
import API from "../api/api";
import { 
  Shield, Users, Activity, HardDrive, Cpu, Ban, Check, UserCheck, 
  Trash2, ToggleLeft, ToggleRight, Laptop, Smartphone, AlertTriangle, 
  ListFilter, Key, RefreshCw, Loader2, Globe
} from "lucide-react";

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("analytics"); // analytics, sessions, security
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [ipWhitelist, setIpWhitelist] = useState("127.0.0.1/32, 192.168.1.0/24");
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch System metrics
      const metricsRes = await API.get("/admin/metrics");
      setMetrics(metricsRes.data);

      // 2. Fetch Users
      const usersRes = await API.get("/admin/users");
      setUsers(usersRes.data);

      // 3. Fetch Sessions
      const sessionsRes = await API.get("/admin/sessions");
      setSessions(sessionsRes.data);

      // 4. Fetch Audit Logs
      const logsRes = await API.get("/admin/audit-logs");
      setAuditLogs(logsRes.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch administrative data. Admin privileges required.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleSuspend = async (userId) => {
    setActionLoading(true);
    try {
      await API.post(`/admin/users/${userId}/suspend`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeRole = async (userId, currentRole) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    setActionLoading(true);
    try {
      await API.post(`/admin/users/${userId}/role?role=${newRole}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    setActionLoading(true);
    try {
      await API.post(`/admin/sessions/${sessionId}/revoke`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSecurity = async () => {
    setActionLoading(true);
    try {
      await API.post("/admin/security-settings", {
        mfa_enabled: mfaEnabled,
        ip_whitelist: ipWhitelist
      });
      alert("Security configuration saved successfully.");
    } catch (err) {
      alert(err.response?.data?.detail || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#00affe] animate-spin mb-4" />
        <span className="text-sm font-mono text-[#aba9bb]">Loading administration module...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-[60vh] max-w-md mx-auto text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Access Denied</h3>
        <p className="text-[#aba9bb] text-sm leading-relaxed mb-6">
          {error}
        </p>
        <button 
          onClick={fetchData} 
          className="bg-primary-gradient px-6 py-2.5 rounded-lg text-black font-semibold text-xs tracking-wider"
        >
          RETRY LINK
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto pb-12 w-full">
      {/* Title */}
      <div className="mb-8 flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl text-[#e9e6f9] mb-2 tracking-tight">Security & Admin Suite</h1>
          <p className="text-[#aba9bb]">Manage quantum credentials, active device nodes, and system analytics.</p>
        </div>
        <button
          onClick={fetchData}
          disabled={actionLoading}
          className="flex items-center gap-2 bg-[#121220] hover:bg-[#1e1e2f] text-sm text-[#b6a0ff] border border-[#b6a0ff]/20 hover:border-[#b6a0ff]/40 px-4 py-2.5 rounded-lg transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${actionLoading ? "animate-spin" : ""}`} />
          <span>Refresh Console</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/5 mb-8">
        <button
          onClick={() => setActiveTab("analytics")}
          className={`pb-4 px-2 text-sm font-semibold tracking-wide transition-colors flex items-center gap-2 ${
            activeTab === "analytics" ? "text-white border-b-2 border-b-[#00affe]" : "text-white/40 hover:text-white/60"
          }`}
        >
          <Activity className="w-4 h-4 text-[#00affe]" />
          <span>System Analytics</span>
        </button>
        
        <button
          onClick={() => setActiveTab("sessions")}
          className={`pb-4 px-2 text-sm font-semibold tracking-wide transition-colors flex items-center gap-2 ${
            activeTab === "sessions" ? "text-white border-b-2 border-b-[#e966ff]" : "text-white/40 hover:text-white/60"
          }`}
        >
          <Laptop className="w-4 h-4 text-[#e966ff]" />
          <span>Multi-device Sessions</span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`pb-4 px-2 text-sm font-semibold tracking-wide transition-colors flex items-center gap-2 ${
            activeTab === "security" ? "text-white border-b-2 border-b-[#b6a0ff]" : "text-white/40 hover:text-white/60"
          }`}
        >
          <Shield className="w-4 h-4 text-[#b6a0ff]" />
          <span>Advanced Security</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === "analytics" && (
        <div className="flex flex-col gap-8 animate-fadeIn">
          {/* Resource Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 bg-[#121220]/40 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-[#00affe]/10 text-[#00affe] border border-[#00affe]/20">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-widest text-[#aba9bb]">CPU Load</p>
                  <p className="text-xl font-bold text-[#e9e6f9] mt-0.5">{metrics?.system?.cpu}%</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 bg-[#121220]/40 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-[#e966ff]/10 text-[#e966ff] border border-[#e966ff]/20">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-widest text-[#aba9bb]">RAM Load</p>
                  <p className="text-xl font-bold text-[#e9e6f9] mt-0.5">{metrics?.system?.memory}%</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 bg-[#121220]/40 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-[#b6a0ff]/10 text-[#b6a0ff] border border-[#b6a0ff]/20">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-widest text-[#aba9bb]">Total Nodes</p>
                  <p className="text-xl font-bold text-[#e9e6f9] mt-0.5">{metrics?.statistics?.total_users} Users</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 bg-[#121220]/40 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-widest text-[#aba9bb]">FAISS Chunks</p>
                  <p className="text-xl font-bold text-[#e9e6f9] mt-0.5">{metrics?.statistics?.vector_nodes} Vectors</p>
                </div>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="glass-card p-6 border-t-2 border-t-[#00affe]">
            <h3 className="font-display text-xl text-[#e9e6f9] mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#00affe]" />
              <span>User Node Management</span>
            </h3>

            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/5 text-[#00affe] text-xs font-mono uppercase tracking-wider">
                    <th className="p-4 font-semibold">User Node</th>
                    <th className="p-4 font-semibold">Security Role</th>
                    <th className="p-4 font-semibold">Auth Status</th>
                    <th className="p-4 font-semibold">Created Timestamp</th>
                    <th className="p-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-[#d4d0ea] divide-y divide-white/5">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-semibold text-[#e9e6f9]">{u.email}</td>
                      <td className="p-4 font-mono text-xs">
                        <span className={`px-2 py-0.5 rounded border ${
                          u.role === 'admin' 
                            ? 'bg-[#b6a0ff]/10 text-[#b6a0ff] border-[#b6a0ff]/30' 
                            : 'bg-white/5 text-white/40 border-white/10'
                        }`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`flex items-center gap-1.5 text-xs ${u.is_active ? 'text-emerald-400' : 'text-red-400'}`}>
                          {u.is_active ? <Check className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                          <span>{u.is_active ? "Active" : "Suspended"}</span>
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs text-[#aba9bb]">
                        {u.created_at ? new Date(u.created_at).toLocaleString() : "Unknown"}
                      </td>
                      <td className="p-4 flex gap-2 justify-center">
                        <button
                          onClick={() => handleToggleSuspend(u.id)}
                          disabled={actionLoading}
                          className={`flex items-center gap-1 text-xs border px-3 py-1.5 rounded-lg transition-colors ${
                            u.is_active 
                              ? 'text-red-400 border-red-500/20 hover:bg-red-500/10' 
                              : 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
                          }`}
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>{u.is_active ? "Suspend" : "Activate"}</span>
                        </button>
                        <button
                          onClick={() => handleChangeRole(u.id, u.role)}
                          disabled={actionLoading}
                          className="flex items-center gap-1 text-xs text-[#b6a0ff] border border-[#b6a0ff]/20 hover:bg-[#b6a0ff]/10 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{u.role === 'admin' ? "Demote" : "Promote Admin"}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "sessions" && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          <div className="glass-card p-6 border-t-2 border-t-[#e966ff] relative overflow-hidden">
            <h3 className="font-display text-xl text-[#e9e6f9] mb-3 flex items-center gap-2">
              <Laptop className="w-5 h-5 text-[#e966ff]" />
              <span>Multi-device Active Sessions</span>
            </h3>
            <p className="text-xs text-[#aba9bb] mb-6 font-light">View and revoke active device nodes that are currently synced to this Second Brain.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions.map((s) => (
                <div key={s.id} className="glass-card p-5 bg-[#121220]/40 border border-white/5 hover:border-[#e966ff]/20 transition-all flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="p-3 rounded-lg bg-[#e966ff]/10 text-[#e966ff] border border-[#e966ff]/20 shrink-0">
                      {s.device_type.toLowerCase().includes("mobile") || s.device_type.toLowerCase().includes("iphone") ? (
                        <Smartphone className="w-5 h-5" />
                      ) : (
                        <Laptop className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white/95">{s.device_type}</h4>
                      <div className="flex items-center gap-2 text-xs text-[#aba9bb] mt-1">
                        <Globe className="w-3.5 h-3.5" />
                        <span>{s.ip_address} ({s.location})</span>
                      </div>
                      <p className="text-[10px] font-mono text-white/30 mt-2">Active: {new Date(s.last_active).toLocaleString()}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevokeSession(s.id)}
                    disabled={actionLoading}
                    className="p-2 rounded bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                    title="Terminate Session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "security" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Settings panel */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="glass-card p-6 border-t-2 border-t-[#b6a0ff]">
              <h3 className="font-display text-lg text-[#e9e6f9] mb-4 flex items-center gap-2">
                <Key className="w-4 h-4 text-[#b6a0ff]" />
                <span>Security Configuration</span>
              </h3>

              <div className="space-y-6">
                {/* MFA Switch */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Multi-Factor Auth (MFA)</h4>
                    <p className="text-[10px] text-[#aba9bb] leading-relaxed mt-0.5">Require TOTP authentication on vault decryption.</p>
                  </div>
                  <button 
                    onClick={() => setMfaEnabled(!mfaEnabled)}
                    className="text-[#b6a0ff]"
                  >
                    {mfaEnabled ? (
                      <ToggleRight className="w-9 h-9" />
                    ) : (
                      <ToggleLeft className="w-9 h-9 text-white/20" />
                    )}
                  </button>
                </div>

                {/* IP Whitelist */}
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2">IP Whitelist Rules</h4>
                  <input
                    type="text"
                    value={ipWhitelist}
                    onChange={(e) => setIpWhitelist(e.target.value)}
                    className="w-full bg-[#121220] border border-white/10 text-white rounded-lg p-3 text-xs outline-none focus:border-[#b6a0ff]/50 font-mono"
                  />
                  <p className="text-[9px] text-[#aba9bb]/70 mt-1 leading-normal">Comma-separated IPv4/IPv6 CIDR ranges.</p>
                </div>

                <button
                  onClick={handleSaveSecurity}
                  disabled={actionLoading}
                  className="w-full bg-primary-gradient py-2.5 rounded-lg text-black font-semibold text-xs tracking-wider"
                >
                  SAVE SECURITY SETTINGS
                </button>
              </div>
            </div>
          </div>

          {/* Audit Logs */}
          <div className="lg:col-span-2 glass-card p-6 border-t-2 border-t-[#aba9bb]/30">
            <h3 className="font-display text-lg text-[#e9e6f9] mb-4 flex items-center gap-2">
              <ListFilter className="w-4 h-4 text-[#aba9bb]" />
              <span>Real-time Security Audit Logs</span>
            </h3>

            <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-2">
              {auditLogs.map((log, idx) => (
                <div key={idx} className="flex gap-4 p-3 bg-[#121220]/60 rounded-xl border border-white/5 text-xs items-start">
                  <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white/90">{log.event}</span>
                      <span className="font-mono text-[9px] text-white/30">{log.ip}</span>
                    </div>
                    <p className="text-[#aba9bb] mt-1 font-light leading-relaxed">{log.details}</p>
                    <span className="text-[9px] font-mono text-white/20 mt-1.5 block">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
