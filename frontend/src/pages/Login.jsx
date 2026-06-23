import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api/api";
import { Shield, Mail, Lock, Loader2, ArrowRight, AlertCircle, Sparkles } from "lucide-react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // Feedback states
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [googleClientId, setGoogleClientId] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await API.get("/auth/config");
        setGoogleClientId(res.data.google_client_id);
      } catch (err) {
        console.error("Failed to load auth config", err);
      }
    };
    fetchConfig();
  }, []);

  const handleCredentialResponse = async (response) => {
    setGoogleLoading(true);
    setError("");
    try {
      const res = await API.post("/auth/google", {
        token: response.credential
      });
      if (res.data.access_token) {
        localStorage.setItem("access_token", res.data.access_token);
        localStorage.setItem("refresh_token", res.data.refresh_token);
        localStorage.setItem("email", res.data.email);
        localStorage.setItem("role", res.data.role);
        navigate("/");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Google authentication failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId) return;

    const initializeGoogleSignIn = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse
        });
        
        const buttonContainer = document.getElementById("google-signin-btn-container");
        if (buttonContainer) {
          window.google.accounts.id.renderButton(
            buttonContainer,
            { 
              theme: "filled_black", 
              size: "large", 
              width: "382", 
              type: "standard",
              text: "continue_with",
              shape: "rectangular"
            }
          );
        }
      }
    };

    if (window.google) {
      initializeGoogleSignIn();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          initializeGoogleSignIn();
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [googleClientId]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await API.post("/auth/login", { email, password });
      if (res.data.access_token) {
        localStorage.setItem("access_token", res.data.access_token);
        localStorage.setItem("refresh_token", res.data.refresh_token);
        localStorage.setItem("email", res.data.email);
        localStorage.setItem("role", res.data.role);
        setSuccessMsg("System synchronization initialized.");
        setTimeout(() => {
          navigate("/");
        }, 1000);
      }
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      if (detail === "Email verification pending.") {
        navigate("/verify-email", { state: { email } });
      } else {
        setError(detail || "Authentication request failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06050a] flex items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Background Animated Glows */}
      <div className="absolute top-[20%] left-[10%] w-[30vw] h-[30vw] bg-[#7a5af8] opacity-[0.08] blur-[120px] rounded-full animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[10%] w-[35vw] h-[35vw] bg-[#00affe] opacity-[0.06] blur-[140px] rounded-full animate-pulse delay-700 pointer-events-none"></div>

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

          <h3 className="text-xl font-bold text-white mb-6 text-center tracking-wide">SIGN IN</h3>

          {/* Status Alert logs */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="text-xs text-red-300 font-mono leading-normal">{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
              <span className="text-xs text-emerald-300 leading-normal">{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[10px] font-mono tracking-widest text-[#aba9bb] uppercase block mb-1.5 pl-1">Email Node Address</label>
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

            <div>
              <div className="flex justify-between items-center mb-1.5 px-1">
                <label className="text-[10px] font-mono tracking-widest text-[#aba9bb] uppercase block">Quantum Encryption Cipher</label>
                <Link to="/forgot-password" className="text-[10px] text-[#b6a0ff] hover:underline uppercase tracking-wide">Forgot?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-white/30" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  <span>INITIALIZE SYNC</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Create Account Link */}
          <div className="text-center mt-6">
            <p className="text-xs text-[#aba9bb]">
              New node?{" "}
              <Link to="/signup" className="text-[#b6a0ff] hover:underline font-semibold">
                Create Vault Account
              </Link>
            </p>
          </div>

          {/* Separator */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-[1px] bg-white/5"></div>
            <span className="text-[10px] font-mono text-white/20 mx-4 uppercase">OR COGNITIVE AUTH</span>
            <div className="flex-1 h-[1px] bg-white/5"></div>
          </div>

          {/* OAuth Buttons */}
          <div className="w-full flex justify-center relative min-h-[46px]">
            {googleLoading && (
              <div className="absolute inset-0 bg-[#06050a]/80 flex items-center justify-center z-10 rounded-xl">
                <Loader2 className="w-5 h-5 animate-spin text-[#b6a0ff]" />
              </div>
            )}
            <div id="google-signin-btn-container" className="w-full flex justify-center"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
