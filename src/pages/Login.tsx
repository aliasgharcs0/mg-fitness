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

      <div className="flex-1 flex items-center justify-center min-h-0 relative overflow-hidden">
        {/* Full background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-[fade-in_0.8s_ease-out_forwards]"
          style={{ backgroundImage: `url(${gymImages.loginHero})` }}
          aria-hidden
        />

        {/* Centered content: hero text + sign-in card */}
        <div className="relative z-10 w-full max-w-md mx-auto px-6 flex flex-col items-center gap-6">
          <p className="text-white text-center text-xl md:text-2xl font-bold drop-shadow-md">
            Your strength starts here
          </p>
          <p className="text-white/90 text-center text-sm -mt-4">
            Sign in with your username and password. Members and staff use the same login.
          </p>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-lg w-full">
            <div className="flex flex-col items-center gap-2 text-center mb-6 md:hidden">
              <p className="text-sm text-muted-foreground">
                Sign in with your username and password
              </p>
            </div>
            <div className="hidden md:block mb-6">
              <h2 className="text-lg font-semibold text-foreground">Sign in</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enter your username and password to continue
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium block text-foreground">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium block text-foreground">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-colors"
                />
              </div>
              {error && (
                <p className="text-xs text-destructive font-medium">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-amber-600 disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
