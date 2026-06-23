import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API from "../api/api";
import { Shield, Lock, Loader2, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  // Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const navigate = useNavigate();

  // Password strength checks
  const [checks, setChecks] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false
  });

  useEffect(() => {
    setChecks({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()\-=_+[\]{}|;:',.<>?/`~]/.test(password)
    });
  }, [password]);

  const strengthScore = Object.values(checks).filter(Boolean).length;

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!token) {
      setError("Reset token is missing from the request path.");
      return;
    }
    if (strengthScore < 5) {
      setError("Please satisfy all password complexity parameters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/reset-password", {
        token,
        new_password: password
      });
      setSuccessMsg(res.data.message || "Passphrase updated successfully.");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Passphrase reset failed. The token may have expired.");
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

          <h3 className="text-xl font-bold text-white mb-2 text-center tracking-wide">RESET CIPHER</h3>
          <p className="text-xs text-[#aba9bb] text-center mb-6 leading-relaxed">
            Enter your new vault encryption passphrase below.
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

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="text-[10px] font-mono tracking-widest text-[#aba9bb] uppercase block mb-1.5 pl-1">New Passphrase</label>
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

              {/* Password strength checks UI */}
              {password && (
                <div className="mt-3 space-y-2">
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((idx) => (
                      <div
                        key={idx}
                        className={`h-full flex-1 transition-all duration-300 ${
                          idx <= strengthScore
                            ? strengthScore <= 2
                              ? "bg-red-500"
                              : strengthScore <= 4
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                            : "bg-white/5"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 pl-1.5">
                    <span className={`text-[8px] font-mono ${checks.length ? "text-emerald-400" : "text-white/20"}`}>✓ 8+ characters</span>
                    <span className={`text-[8px] font-mono ${checks.upper ? "text-emerald-400" : "text-white/20"}`}>✓ Uppercase letter</span>
                    <span className={`text-[8px] font-mono ${checks.lower ? "text-emerald-400" : "text-white/20"}`}>✓ Lowercase letter</span>
                    <span className={`text-[8px] font-mono ${checks.number ? "text-emerald-400" : "text-white/20"}`}>✓ Digit</span>
                    <span className={`text-[8px] font-mono ${checks.special ? "text-emerald-400" : "text-white/20"}`}>✓ Special symbol</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-mono tracking-widest text-[#aba9bb] uppercase block mb-1.5 pl-1">Confirm New Passphrase</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-white/30" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  <span>UPDATE PASSPHRASE</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
