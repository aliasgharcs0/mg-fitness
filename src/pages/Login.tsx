import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Dumbbell } from "lucide-react";
import { gymImages } from "@/lib/gymImages";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-background">
      {/* Branded header – same style as app */}
      <header className="w-full border-b border-border bg-card px-4 py-3 flex items-center justify-center gap-2 shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
          <Dumbbell className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-bold text-foreground tracking-tight">
          MG Fitness
        </h1>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <div
          className="hidden md:flex md:w-1/2 lg:w-3/5 relative bg-cover bg-center min-h-[280px] md:min-h-0"
          style={{ backgroundImage: `url(${gymImages.loginHero})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <div className="relative z-10 flex flex-col justify-end p-8 lg:p-12 text-white">
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">
              Your strength starts here
            </h2>
            <p className="text-white/90 text-sm lg:text-base mt-1 max-w-sm">
              Sign in with your username and password. Members and staff use the same login.
            </p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 md:p-8">
          <div className="w-full max-w-md rounded-2xl border border-border overflow-hidden shadow-lg relative">
            {/* Fade-in background image behind the card */}
            <div
              className="absolute inset-0 bg-cover bg-center animate-[fade-in_0.7s_ease-out_forwards]"
              style={{ backgroundImage: `url(${gymImages.loginHero})` }}
              aria-hidden
            />
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />
            <div className="relative z-10 p-6">
              <div className="flex flex-col items-center gap-2 text-center mb-6 md:hidden">
                <p className="text-sm text-white/90">
                  Sign in with your username and password
                </p>
              </div>
              <div className="hidden md:block mb-6">
                <h2 className="text-lg font-semibold text-white">Sign in</h2>
                <p className="text-xs text-white/80 mt-0.5">
                  Enter your username and password to continue
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium block text-white">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/50 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium block text-white">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/50 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-colors"
                  />
                </div>
                {error && (
                  <p className="text-xs text-amber-200 font-medium">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-amber-600 disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-black/30"
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
