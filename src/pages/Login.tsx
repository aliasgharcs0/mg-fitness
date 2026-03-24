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
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(
        msg === "Failed to fetch"
          ? "Cannot reach Supabase. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <header className="w-full border-b border-[#FF7A1A]/40 bg-black/45 backdrop-blur-xl px-4 py-3 flex items-center justify-center gap-2 shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#FF4D00] to-[#FFC300] text-white shadow-neon-orange border border-white/20">
          <Dumbbell className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-extrabold tracking-wider uppercase font-headings text-transparent bg-clip-text bg-gradient-to-r from-[#FF4D00] to-[#FFC300]">
          MG Fitness
        </h1>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Left panel – industrial neon hero with local image */}
        <div
          className="hidden md:flex md:w-1/2 lg:w-3/5 relative min-h-[280px] md:min-h-0 overflow-hidden rounded-sm border border-white/10"
          style={{
            backgroundImage: `url(${gymImages.loginHero})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(204,255,0,0.28),transparent_55%),radial-gradient(circle_at_80%_10%,rgba(204,255,0,0.16),transparent_45%),linear-gradient(to_top,rgba(0,0,0,0.85),transparent_60%)]" />
          <div className="absolute inset-0 grid-pattern opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
          <div className="relative z-10 flex flex-col justify-end p-8 lg:p-12 text-white">
            <h2 className="text-2xl lg:text-3xl font-extrabold tracking-wider uppercase font-headings">
              Your Strength Starts Here
            </h2>
            <p className="text-white/90 text-sm lg:text-base mt-1 max-w-sm">
              Sign in with your username and password. Members and staff use the same login.
            </p>
          </div>
        </div>

        {/* Right panel – sign-in card on plain background */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-8 bg-background">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-[0_0_48px_-8px_rgba(0,0,0,0.85)]">
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
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder=" "
                  required
                  className="peer w-full rounded-xl border border-white/15 bg-background/70 px-3 py-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-[#FF4D00]/60"
                />
                <label className="pointer-events-none absolute left-3 top-3 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-xs peer-focus:-top-2 peer-focus:bg-background peer-focus:px-1 peer-focus:text-[10px] peer-focus:text-[#FFB300] peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:bg-background peer-[&:not(:placeholder-shown)]:px-1 peer-[&:not(:placeholder-shown)]:text-[10px]">
                  Username
                </label>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder=" "
                  required
                  className="peer w-full rounded-xl border border-white/15 bg-background/70 px-3 py-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-[#FF4D00]/60"
                />
                <label className="pointer-events-none absolute left-3 top-3 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-xs peer-focus:-top-2 peer-focus:bg-background peer-focus:px-1 peer-focus:text-[10px] peer-focus:text-[#FFB300] peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:bg-background peer-[&:not(:placeholder-shown)]:px-1 peer-[&:not(:placeholder-shown)]:text-[10px]">
                  Password
                </label>
              </div>
              {error && (
                <p className="text-xs text-destructive font-medium">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-gradient-to-r from-[#FF4D00] to-[#FFC300] px-4 py-3 text-sm font-extrabold text-white border border-white/20 shadow-glow-cyber transition-all hover:scale-105 hover:brightness-110 hover:shadow-glow-cyber-lg disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/60"
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
