import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hand, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

// ⚠️  Uses FastAPI /login endpoint — NOT the old localhost:3000 Node server
const API_BASE = import.meta.env.VITE_API_URL || "https://talhazafar7406-signverse-api.hf.space";

export default function Login() {
  const navigate = useNavigate();

  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setError(""); setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        // Store user info for dashboard
        localStorage.setItem("signverse_user", JSON.stringify(data.user));
        navigate("/dashboard");
      } else {
        setError(data.detail || data.message || "Invalid email or password.");
      }
    } catch (e) {
      // If backend is sleeping, retry once after a short delay
      try {
        await new Promise(r => setTimeout(r, 2000));
        const res2 = await fetch(`${API_BASE}/login`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ email: email.trim(), password }),
        });
        const data2 = await res2.json();
        if (res2.ok && data2.user) {
          localStorage.setItem("signverse_user", JSON.stringify(data2.user));
          navigate("/dashboard");
          return;
        }
        setError(data2.detail || "Login failed. Please try again.");
      } catch {
        setError("Cannot reach server. It may be starting up — please wait 30 seconds and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Demo quick-login
  const quickLogin = (role: "admin" | "user") => {
    if (role === "admin") { setEmail("fa22-bscs-212@lgu.edu.pk"); setPassword("talha123"); }
    else                  { setEmail("demo@signverse.com");         setPassword("demo123");  }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl mb-4">
            <Hand className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">SignVerse</h1>
          <p className="text-gray-400 mt-2">Bidirectional ASL Translation Platform</p>
        </div>

        {/* Form */}
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-6">Sign in</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                           text-white placeholder-gray-500 focus:outline-none focus:border-purple-500
                           transition-colors"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-12
                             text-white placeholder-gray-500 focus:outline-none focus:border-purple-500
                             transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3
                              text-red-300 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-60
                         disabled:cursor-not-allowed rounded-xl font-semibold text-white
                         flex items-center justify-center gap-2 transition-all"
            >
              {loading
                ? <><Loader2 className="w-5 h-5 animate-spin" />Signing in…</>
                : "Sign in"}
            </button>
          </form>

          {/* Quick login helpers for demo */}
          <div className="mt-6 pt-5 border-t border-gray-800">
            <p className="text-xs text-gray-500 text-center mb-3">Quick demo login</p>
            <div className="flex gap-2">
              <button
                onClick={() => quickLogin("admin")}
                className="flex-1 text-xs py-2 rounded-lg bg-gray-800 hover:bg-gray-700
                           text-gray-400 hover:text-white transition-colors border border-gray-700"
              >
                Admin
              </button>
              <button
                onClick={() => quickLogin("user")}
                className="flex-1 text-xs py-2 rounded-lg bg-gray-800 hover:bg-gray-700
                           text-gray-400 hover:text-white transition-colors border border-gray-700"
              >
                Demo User
              </button>
            </div>
            <p className="text-xs text-gray-600 text-center mt-2">
              Admin: fa22-bscs-212@lgu.edu.pk / talha123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}