import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Outlet, useNavigate, Navigate } from "react-router-dom";
import API from "./api/api";

import Layout from "./components/Layout";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Chat = lazy(() => import("./pages/Chat"));
const Upload = lazy(() => import("./pages/Upload"));
const Voice = lazy(() => import("./pages/Voice"));
const Login = lazy(() => import("./pages/Login"));
const SignUp = lazy(() => import("./pages/SignUp"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Settings = lazy(() => import("./pages/Settings"));
const Help = lazy(() => import("./pages/Help"));

const ProtectedRoute = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [statusMsg, setStatusMsg] = useState("Connecting to Neural Vault...");

  useEffect(() => {
    let isMounted = true;

    const checkAuthWithRetry = async (retries = 3, delayMs = 3000) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        if (!isMounted) return;
        try {
          if (attempt > 1) {
            setStatusMsg(`Waking up server (Attempt ${attempt}/${retries})...`);
          }

          // Step 1: Check existing session
          const res = await API.get("/auth/me");
          localStorage.setItem("email", res.data.email);
          localStorage.setItem("role", res.data.role);
          localStorage.setItem("profile_name", res.data.name);
          localStorage.setItem("profile_pic", res.data.profile_picture || "");
          if (isMounted) setStatus("authenticated");
          return;
        } catch {
          // Step 2: Auto-login
          try {
            const loginRes = await API.post("/auth/login", {
              email: import.meta.env.VITE_DEFAULT_ADMIN_EMAIL || "kethavathnaveennaik1234@gmail.com",
              password: import.meta.env.VITE_DEFAULT_ADMIN_PASSWORD || "Naveen@123//"
            });
            const { access_token, refresh_token, email, role } = loginRes.data;
            localStorage.setItem("access_token", access_token);
            localStorage.setItem("refresh_token", refresh_token);
            localStorage.setItem("email", email);
            localStorage.setItem("role", role);

            const meRes = await API.get("/auth/me");
            localStorage.setItem("profile_name", meRes.data.name);
            localStorage.setItem("profile_pic", meRes.data.profile_picture || "");
            if (isMounted) setStatus("authenticated");
            return;
          } catch (loginErr) {
            console.warn(`Connection attempt ${attempt} failed:`, loginErr);
            if (attempt < retries) {
              await new Promise((r) => setTimeout(r, delayMs));
            }
          }
        }
      }
      if (isMounted) setStatus("unauthenticated");
    };

    checkAuthWithRetry();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (status === "loading") {
    return <Loading message={statusMsg} />;
  }

  if (status === "unauthenticated") {
    const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8001";
    const isLocalhost = backendUrl.includes("localhost") || backendUrl.includes("127.0.0.1");

    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0b0a10] text-white p-6 text-center">
        <div className="w-12 h-12 mb-4 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
          ⚠️
        </div>
        <h2 className="text-xl font-bold mb-2">Vault Connection Failed</h2>
        <p className="text-xs text-white/60 max-w-md mb-4">
          Could not establish connection with the backend server at <code className="text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded">{backendUrl}</code>.
        </p>

        {isLocalhost && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 max-w-md mb-6 text-left">
            <p className="text-xs text-amber-300 font-semibold mb-1">💡 Action Required in Vercel:</p>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              Your Vercel site is trying to reach <code className="text-amber-100 font-bold">localhost</code>. You must set <code className="text-amber-100 font-bold">VITE_API_URL</code> in Vercel Project Settings ➔ Environment Variables to your live Render backend URL, then redeploy!
            </p>
          </div>
        )}

        <button 
          onClick={() => window.location.reload()}
          className="bg-purple-600 hover:bg-purple-700 px-6 py-2.5 rounded-lg text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all"
        >
          RETRY CONNECTION
        </button>
      </div>
    );
  }

  return status === "authenticated" ? <Outlet /> : null;
};


const Loading = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-screen bg-[#0b0a10] text-white">
    <div className="relative w-32 h-32 flex items-center justify-center mb-4">
      <div className="absolute inset-0 bg-[#b6a0ff] opacity-10 blur-2xl rounded-full animate-pulse"></div>
      <video
        src={`${import.meta.env.BASE_URL}logo.mp4`}
        autoPlay
        loop
        muted
        playsInline
        className="w-24 h-24 rounded-full object-cover border border-purple-500/20 shadow-[0_0_30px_rgba(182,160,255,0.3)] bg-black/40"
      />
    </div>
    <p className="text-xs text-purple-300/80 font-medium tracking-wide animate-pulse">{message || "Connecting..."}</p>
  </div>
);


function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Redirect authentication routes to home since login is removed */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Navigate to="/" replace />} />
          <Route path="/forgot-password" element={<Navigate to="/" replace />} />
          <Route path="/reset-password" element={<Navigate to="/" replace />} />
          <Route path="/verify-email" element={<Navigate to="/" replace />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/email" element={<Navigate to="/" replace />} />
              <Route path="/voice" element={<Voice />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<Help />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;