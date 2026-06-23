import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Outlet, useNavigate } from "react-router-dom";
import API from "./api/api";

import Layout from "./components/Layout";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Chat = lazy(() => import("./pages/Chat"));
const Upload = lazy(() => import("./pages/Upload"));
const Email = lazy(() => import("./pages/Email"));
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
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await API.get("/auth/me");
        if (!res.data.is_verified) {
          setUserEmail(res.data.email);
          setStatus("unverified");
        } else {
          localStorage.setItem("email", res.data.email);
          localStorage.setItem("role", res.data.role);
          localStorage.setItem("profile_name", res.data.name);
          localStorage.setItem("profile_pic", res.data.profile_picture || "");
          setStatus("authenticated");
        }
      } catch (err) {
        setStatus("unauthenticated");
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (status === "unauthenticated") {
      navigate("/login");
    } else if (status === "unverified") {
      navigate("/verify-email", { state: { email: userEmail } });
    }
  }, [status, navigate, userEmail]);

  if (status === "loading") {
    return <Loading />;
  }

  return status === "authenticated" ? <Outlet /> : null;
};

const Loading = () => (
  <div className="flex items-center justify-center h-screen bg-[#0b0a10]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/email" element={<Email />} />
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