import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Outlet, useNavigate, Navigate } from "react-router-dom";
import API from "./api/api";

import Layout from "./components/Layout";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Chat = lazy(() => import("./pages/Chat"));
const Upload = lazy(() => import("./pages/Upload"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Voice = lazy(() => import("./pages/Voice"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await API.get("/auth/me");
        localStorage.setItem("email", res.data.email);
        localStorage.setItem("role", res.data.role);
        localStorage.setItem("profile_name", res.data.name);
        localStorage.setItem("profile_pic", res.data.profile_picture || "");
        setStatus("authenticated");
      } catch {
        // Automatically attempt background login if unauthenticated
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

          // Get profile details
          const meRes = await API.get("/auth/me");
          localStorage.setItem("profile_name", meRes.data.name);
          localStorage.setItem("profile_pic", meRes.data.profile_picture || "");
          setStatus("authenticated");
        } catch (loginErr) {
          console.error("Auto-login failed:", loginErr);
          setStatus("unauthenticated");
        }
      }
    };
    checkAuth();
  }, [navigate]);

  if (status === "loading") {
    return <Loading />;
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0b0a10] text-white">
        <h2 className="text-xl font-bold mb-2">Vault Connection Failed</h2>
        <p className="text-xs text-white/50 mb-4">Could not establish background connection with the default profile.</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-xs font-semibold"
        >
          RETRY CONNECTION
        </button>
      </div>
    );
  }

  return status === "authenticated" ? <Outlet /> : null;
};

const Loading = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-[#0b0a10]">
    <div className="relative w-32 h-32 flex items-center justify-center">
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
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/voice" element={<Voice />} />
              <Route path="/admin" element={<AdminDashboard />} />
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