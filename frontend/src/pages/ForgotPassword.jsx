import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";
import { Shield, Mail, Loader2, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  
  // Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await API.post("/auth/forgot-password", { email });
      setSuccessMsg(res.data.message || "A recovery link has been dispatched to your email node.");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Request failed. Check email address.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06050a] flex items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Background Animated Glows */}
      <div className="absolute top-[20%] left-[10%] w-[30vw] h-[30vw] bg-[#7a5af8] opacity-[0.08] blur-[120px] rounded-full pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[20%] right-[10%] w-[35vw] h-[35vw] bg-[#00affe] opacity-[0.06] blur-[140px] rounded-full pointer-events-none animate-pulse delay-700"></div>

      <div className="w-full max-w-md z-10">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#7a5af8] to-[#b6a0ff] flex items-center justify-center shadow-[0_0_20px_rgba(122,90,248,0.3)] mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h2 className="font-display font-bold text-3xl tracking-wide text-white">ARCHIVIST AI</h2>
          <p className="text-[#aba9bb] text-sm mt-1">Cognitive Knowledge Base Vault</p>
        </div>

        {/* Auth Box */}
        <div className="glass-card relative overflow-hidden p-8 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#b6a0ff]/50 to-transparent"></div>

          <h3 className="text-xl font-bold text-white mb-2 text-center tracking-wide">RECOVER CIPHER</h3>
          <p className="text-xs text-[#aba9bb] text-center mb-6 leading-relaxed">
            Enter your registered email address and we'll dispatch a secure recovery token node.
          </p>

          {/* Status Alerts */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="text-xs text-red-300 font-mono leading-normal">{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-xs text-emerald-300 leading-normal">{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="text-[10px] font-mono tracking-widest text-[#aba9bb] uppercase block mb-1.5 pl-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  required
                  placeholder="node@secondbrain.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#121220] border border-white/10 text-white rounded-xl py-3 pl-10 pr-4 outline-none focus:border-[#b6a0ff]/50 transition-colors text-sm font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-gradient py-3.5 rounded-xl text-black font-semibold tracking-wide hover:shadow-glow-primary transition-all flex items-center justify-center gap-2 mt-6 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>DISPATCH LINK</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="text-center mt-6">
            <Link to="/login" className="text-[#b6a0ff] hover:underline text-xs font-semibold">
              Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
