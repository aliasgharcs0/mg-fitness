import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Scanner } from "@yudiel/react-qr-scanner";
import {
  LayoutDashboard,
  ScanLine,
  Receipt,
  LogOut,
  CheckCircle2,
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  CalendarDays,
  QrCode,
  UtensilsCrossed,
  Plus,
  X,
  Save,
  UserPlus,
  Home,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
  Archive,
  ChevronLeft,
  Upload,
  KeyRound,
  ShieldCheck,
  Coffee,
  Utensils,
  AlertTriangle,
} from "lucide-react";
import { type WeeklyMenu, type MealType, DAYS_OF_WEEK, fetchMenuFromSupabase, saveMenuToSupabase } from "@/lib/menuData";
import { type Student, type Hostel, type AppSettings, type BillingEntry, type MonthlyBilling, generateId, getCurrentMonthLabel } from "@/lib/appData";
import ThemeToggle from "@/components/ThemeToggle";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// Auto-detect current meal based on time of day
function detectCurrentMeal(): MealType {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  return "dinner";
}

const MEAL_LABELS: Record<MealType, { label: string; icon: typeof Coffee }> = {
  breakfast: { label: "Breakfast", icon: Coffee },
  lunch: { label: "Lunch", icon: Utensils },
  dinner: { label: "Dinner", icon: UtensilsCrossed },
};

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "scanner" | "billing" | "menu" | "students" | "hostels">("overview");

  // Students & Hostels (from Supabase)
  const [students, setStudents] = useState<any[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({ billVisibleToStudents: false });
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [batchUploadResult, setBatchUploadResult] = useState<{ added: number; skipped: number } | null>(null);
  const batchFileRef = useRef<HTMLInputElement>(null);
  const [showAddHostel, setShowAddHostel] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: "", roll_number: "", pin: "", hostel_id: "", role: "student" as "student" | "admin" });
  const [changePinUser, setChangePinUser] = useState<string | null>(null);
  const [newPinValue, setNewPinValue] = useState("");
  const [pinChangeLoading, setPinChangeLoading] = useState(false);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [newHostel, setNewHostel] = useState({ name: "", type: "boys" as "boys" | "girls" | "mixed" });

  const fetchStudents = useCallback(async () => {
    const { data } = await supabase.from("users").select("*");
    if (data) setStudents(data);
    // Fetch roles for all users
    const { data: rolesData } = await supabase.from("user_roles").select("user_id, role");
    if (rolesData) {
      const rolesMap: Record<string, string> = {};
      rolesData.forEach((r: any) => { rolesMap[r.user_id] = r.role; });
      setUserRoles(rolesMap);
    }
  }, []);

  const fetchHostels = useCallback(async () => {
    const { data } = await supabase.from("hostels").select("*");
    if (data) setHostels(data);
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchHostels();
    // Fetch app settings from Supabase
    supabase.from("app_settings").select("bill_visible_to_students").eq("id", 1).single().then(({ data }) => {
      if (data) setAppSettings({ billVisibleToStudents: data.bill_visible_to_students });
    });
  }, [fetchStudents, fetchHostels]);

  // Refresh students when switching to scanner tab
  useEffect(() => {
    if (activeTab === "scanner") fetchStudents();
  }, [activeTab, fetchStudents]);

  // Menu state
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu>({ weekStart: "", defaultPrices: { breakfast: 100, lunch: 200, dinner: 250 }, days: [] });
  const [editingCell, setEditingCell] = useState<{ day: number; meal: MealType } | null>(null);
  const [newItem, setNewItem] = useState("");
  const [menuSaved, setMenuSaved] = useState(false);

  useEffect(() => {
    fetchMenuFromSupabase().then(setWeeklyMenu);
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const isAdmin = roles?.some((r: any) => r.role === "admin");
      if (!isAdmin) navigate("/login");
    };
    checkAdmin();
  }, [navigate]);

  const [scannerMode, setScannerMode] = useState<"rfid" | "qr">("rfid");
  const [scanResult, setScanResult] = useState<{ name: string; rollNumber: string; meal: MealType; status: "approved" | "already_scanned" | "not_booked" | "unknown" } | null>(null);
  const [rfidInput, setRfidInput] = useState("");
  const rfidInputRef = useRef<HTMLInputElement>(null);
  const [currentMeal, setCurrentMeal] = useState<MealType>(detectCurrentMeal);

  // Update detected meal every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentMeal(detectCurrentMeal()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === "scanner" && scannerMode === "rfid" && !scanResult) rfidInputRef.current?.focus();
  }, [activeTab, scannerMode, scanResult]);

  const triggerSuccess = async (rawCode: string) => {
    // Handle QR codes that may contain comma-separated data (e.g. "Name,RollNumber,...")
    // or just the roll number directly
    const parts = rawCode.trim().split(",");
    // Strip common prefixes like "id:" and clean up each part
    const possibleCodes = [rawCode.trim(), ...parts]
      .map((c) => c.trim().replace(/^id:/i, "").trim().toLowerCase())
      .filter(Boolean);

    const student = students.find(
      (s) => possibleCodes.includes(s.roll_number.toLowerCase())
    );
    if (!student) {
      setScanResult({ name: rawCode, rollNumber: "", meal: currentMeal, status: "unknown" });
      setTimeout(() => setScanResult(null), 3000);
      setRfidInput("");
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    // Check if student booked this meal
    const { data: booking } = await supabase
      .from("meal_bookings")
      .select("id, status")
      .eq("user_id", student.id)
      .eq("booking_date", today)
      .eq("meal_type", currentMeal);

    const bookedEntry = booking?.find((b) => b.status === "booked");
    const scannedEntry = booking?.find((b) => b.status === "scanned");

    if (scannedEntry) {
      // Already scanned
      setScanResult({ name: student.name, rollNumber: student.roll_number, meal: currentMeal, status: "already_scanned" });
    } else if (bookedEntry) {
      // Has booking → approve and update status to "scanned"
      await supabase
        .from("meal_bookings")
        .update({ status: "scanned" })
        .eq("id", bookedEntry.id);
      setScanResult({ name: student.name, rollNumber: student.roll_number, meal: currentMeal, status: "approved" });
    } else {
      // No booking for this meal
      setScanResult({ name: student.name, rollNumber: student.roll_number, meal: currentMeal, status: "not_booked" });
    }

    setRfidInput("");
    setTimeout(() => setScanResult(null), 3000);
  };

  const handleRFIDSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rfidInput.trim().length > 0) triggerSuccess(rfidInput);
  };

  // --- Real meal stats from Supabase ---
  const [mealStats, setMealStats] = useState([
    { label: "Breakfast", count: 0, sub: "Booked", trend: "" },
    { label: "Lunch", count: 0, sub: "Booked", trend: "" },
    { label: "Dinner", count: 0, sub: "Booked", trend: "" },
  ]);
  const [hostelBreakdown, setHostelBreakdown] = useState<{ name: string; breakfast: number; lunch: number; dinner: number; total: number }[]>([]);
  const [totalForDay, setTotalForDay] = useState(0);

  // Week day selector for overview
  const getWeekDatesAdmin = useCallback(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    return DAYS_OF_WEEK.map((day, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        day,
        date: d.toISOString().split("T")[0],
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        isToday: d.toISOString().split("T")[0] === now.toISOString().split("T")[0],
      };
    });
  }, []);

  const [adminWeekDates] = useState(getWeekDatesAdmin);
  const [overviewDate, setOverviewDate] = useState(() => {
    const today = new Date().toISOString().split("T")[0];
    return today;
  });

  const fetchOverviewStats = useCallback(async () => {
    const targetDate = overviewDate;
    const { data: dayBookings } = await supabase
      .from("meal_bookings")
      .select("meal_type, user_id")
      .eq("booking_date", targetDate);

    const bookings = dayBookings || [];
    const bfCount = bookings.filter((b) => b.meal_type === "breakfast").length;
    const luCount = bookings.filter((b) => b.meal_type === "lunch").length;
    const diCount = bookings.filter((b) => b.meal_type === "dinner").length;

    setMealStats([
      { label: "Breakfast", count: bfCount, sub: "Booked", trend: "" },
      { label: "Lunch", count: luCount, sub: "Booked", trend: "" },
      { label: "Dinner", count: diCount, sub: "Booked", trend: "" },
    ]);
    setTotalForDay(bfCount + luCount + diCount);

    // Hostel breakdown
    const breakdown: Record<number, { breakfast: number; lunch: number; dinner: number }> = {};
    for (const b of bookings) {
      const student = students.find((s) => s.id === b.user_id);
      const hid = student?.hostel_id;
      if (hid == null) continue;
      if (!breakdown[hid]) breakdown[hid] = { breakfast: 0, lunch: 0, dinner: 0 };
      breakdown[hid][b.meal_type as "breakfast" | "lunch" | "dinner"]++;
    }

    setHostelBreakdown(
      hostels.map((h) => {
        const stats = breakdown[h.id] || { breakfast: 0, lunch: 0, dinner: 0 };
        return { name: `${h.name} (${h.type.charAt(0).toUpperCase() + h.type.slice(1)})`, breakfast: stats.breakfast, lunch: stats.lunch, dinner: stats.dinner, total: stats.breakfast + stats.lunch + stats.dinner };
      })
    );
  }, [students, hostels, overviewDate]);

  useEffect(() => {
    if (students.length > 0 || hostels.length > 0) fetchOverviewStats();
  }, [students, hostels, fetchOverviewStats]);

  const selectedOverviewDay = adminWeekDates.find((d) => d.date === overviewDate);

  const renderOverview = () => (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.header variants={item}>
        <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-1">Dashboard</p>
        <h1 className="text-2xl font-extrabold text-foreground">Campus Overview</h1>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          {selectedOverviewDay?.isToday ? "Today" : selectedOverviewDay?.day} · {selectedOverviewDay?.label}
        </p>
      </motion.header>

      {/* Week Day Selector */}
      <motion.div variants={item} className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {adminWeekDates.map((wd) => (
          <button
            key={wd.date}
            onClick={() => setOverviewDate(wd.date)}
            className={`flex-shrink-0 flex flex-col items-center py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 min-w-[56px] ${
              overviewDate === wd.date
                ? "bg-primary text-primary-foreground shadow-sm"
                : wd.isToday
                ? "bg-accent/10 text-accent border border-accent/20"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{wd.day.slice(0, 3)}</span>
            <span className="text-[9px] mt-0.5 opacity-70">{wd.label}</span>
          </button>
        ))}
      </motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        {mealStats.map((m) => (
          <motion.div
            key={m.label}
            variants={item}
            className="group rounded-xl border border-border bg-card p-5 shadow-card transition-shadow duration-200 hover:shadow-card-hover"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-accent">{m.label}</p>
            <p className="mt-3 text-3xl font-extrabold text-foreground tabular-nums">{m.count}</p>
            <p className="mt-1 text-xs text-muted-foreground">{m.sub}</p>
          </motion.div>
        ))}
      </div>

      <motion.div variants={item} className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-base font-bold text-foreground mb-5 flex items-center gap-2">
          <Building2 className="h-4.5 w-4.5 text-accent" /> Hostel Breakdown
        </h2>
        <div className="space-y-5">
          {hostelBreakdown.map((h) => (
            <div key={h.name} className="border border-border rounded-lg p-4 bg-background/50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold text-foreground">{h.name}</span>
                <span className="text-xs font-bold text-accent tabular-nums bg-accent/10 px-2 py-0.5 rounded">{h.total} total</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Breakfast", count: h.breakfast, color: "bg-warning" },
                  { label: "Lunch", count: h.lunch, color: "bg-accent" },
                  { label: "Dinner", count: h.dinner, color: "bg-primary" },
                ].map((meal) => (
                  <div key={meal.label} className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{meal.label}</p>
                    <p className="text-lg font-extrabold text-foreground tabular-nums">{meal.count}</p>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-1.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((meal.count / Math.max(students.length, 1)) * 100, 100)}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                        className={`h-full rounded-full ${meal.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={item} className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total for Day</p>
          </div>
          <p className="text-3xl font-extrabold text-foreground tabular-nums">{totalForDay}</p>
          <p className="text-xs text-muted-foreground mt-1">meals booked for {selectedOverviewDay?.day}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-accent" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Students</p>
          </div>
          <p className="text-3xl font-extrabold text-foreground tabular-nums">{students.length}</p>
          <p className="text-xs text-muted-foreground mt-1">registered students</p>
        </div>
      </motion.div>
    </motion.div>
  );
  const handleQRScan = (detectedCodes: { rawValue?: string | null }[]) => {
    if (!detectedCodes?.length) return;
    const raw = detectedCodes[0]?.rawValue ?? "";
    const cleaned = raw.trim();
    if (!cleaned) return;
    triggerSuccess(cleaned);
  };

  const renderScanner = () => {
    const MealIcon = MEAL_LABELS[currentMeal].icon;
    const mealLabel = MEAL_LABELS[currentMeal].label;

    if (scanResult) {
      const isApproved = scanResult.status === "approved";
      const isAlready = scanResult.status === "already_scanned";
      const isNotBooked = scanResult.status === "not_booked";

      const bgClass = isApproved
        ? "bg-success text-success-foreground"
        : isAlready
        ? "bg-warning text-warning-foreground"
        : "bg-destructive text-destructive-foreground";

      const title = isApproved
        ? "Meal Approved"
        : isAlready
        ? "Already Scanned"
        : isNotBooked
        ? "Not Booked"
        : "Unknown Student";

      const Icon = isApproved ? CheckCircle2 : isAlready ? AlertTriangle : AlertTriangle;

      return (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`flex h-[50vh] md:h-[70vh] flex-col items-center justify-center rounded-xl shadow-elevated px-4 text-center ${bgClass}`}
        >
          <Icon className="h-16 w-16 md:h-24 md:w-24 animate-bounce" />
          <h2 className="mt-4 md:mt-6 text-2xl md:text-4xl font-extrabold">{title}</h2>
          <p className="mt-2 text-base md:text-xl font-semibold opacity-90 flex items-center gap-2">
            <MealIcon className="h-4 w-4 md:h-5 md:w-5" /> {mealLabel}
          </p>
          {scanResult.rollNumber ? (
            <>
              <p className="mt-2 md:mt-3 text-xl md:text-2xl font-bold opacity-95">{scanResult.name}</p>
              <p className="mt-1 text-sm md:text-lg opacity-80 font-mono">{scanResult.rollNumber}</p>
            </>
          ) : (
            <p className="mt-2 text-sm md:text-lg opacity-90 font-mono">ID: {scanResult.name}</p>
          )}
          {isNotBooked && (
            <p className="mt-2 md:mt-3 text-xs md:text-sm opacity-80">This student has not booked {mealLabel.toLowerCase()} for today.</p>
          )}
        </motion.div>
      );
    }

    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 md:space-y-6">
        <motion.header variants={item} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-1">Scanner</p>
              <h1 className="text-xl md:text-2xl font-extrabold text-foreground">Mess Scanner</h1>
            </div>
            {/* Current Meal Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
              <MealIcon className="h-4 w-4 text-accent" />
              <span className="text-xs md:text-sm font-bold text-accent">{mealLabel}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Meal Override */}
            <div className="flex rounded-lg border border-border bg-secondary p-1 shadow-sm">
              {(["breakfast", "lunch", "dinner"] as MealType[]).map((meal) => {
                const MI = MEAL_LABELS[meal].icon;
                return (
                  <button
                    key={meal}
                    onClick={() => setCurrentMeal(meal)}
                    className={`flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${
                      currentMeal === meal ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <MI className="h-3 w-3" /> <span className="hidden sm:inline">{MEAL_LABELS[meal].label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mode Toggle */}
            <div className="flex rounded-lg border border-border bg-secondary p-1 shadow-sm">
              <button
                onClick={() => setScannerMode("rfid")}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${
                  scannerMode === "rfid" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" /> RFID
              </button>
              <button
                onClick={() => setScannerMode("qr")}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${
                  scannerMode === "qr" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <QrCode className="h-3.5 w-3.5" /> QR
              </button>
            </div>
          </div>
        </motion.header>

        <motion.div variants={item} className="overflow-hidden rounded-xl border border-border bg-card shadow-card flex items-center justify-center h-[50vh] md:h-[60vh] relative">
          {scannerMode === "rfid" ? (
            <div className="text-center flex flex-col items-center px-4">
              <div className="relative">
                <CreditCard className="h-14 w-14 md:h-20 md:w-20 text-accent/20 mb-3" />
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border-2 border-accent/20"
                />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-foreground">Waiting for Card…</h3>
              <p className="text-muted-foreground mt-1.5 text-xs md:text-sm">Please tap student ID on the reader.</p>
              <p className="text-accent font-semibold mt-2 text-xs md:text-sm flex items-center gap-1.5">
                <MealIcon className="h-3.5 w-3.5" /> Scanning for {mealLabel}
              </p>

              <form onSubmit={handleRFIDSubmit}>
                <input
                  ref={rfidInputRef}
                  type="text"
                  value={rfidInput}
                  onChange={(e) => setRfidInput(e.target.value)}
                  className="absolute opacity-0 pointer-events-none"
                  autoFocus
                  onBlur={() => setTimeout(() => rfidInputRef.current?.focus(), 100)}
                />
              </form>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-6">
              <div className="w-full max-w-[280px] md:max-w-sm aspect-square rounded-xl overflow-hidden border-2 border-accent/30 shadow-lg">
                <Scanner
                  onScan={handleQRScan}
                  onError={() => {}}
                  constraints={{ facingMode: "environment" }}
                  styles={{ container: { width: "100%", height: "100%" } }}
                />
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-3 text-center">
                Point the camera at a student's QR code
              </p>
              <p className="text-accent font-semibold mt-1.5 text-xs md:text-sm flex items-center gap-1.5">
                <MealIcon className="h-3.5 w-3.5" /> Scanning for {mealLabel}
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    );
  };

  // --- Billing from Supabase ---
  const [billingData, setBillingData] = useState<BillingEntry[]>([]);
  const [billingHistory, setBillingHistory] = useState<MonthlyBilling[]>([]);
  const [viewingMonth, setViewingMonth] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const currentMonthLabel = getCurrentMonthLabel();

  const fetchBillingData = useCallback(async () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    const { data: bookings } = await supabase
      .from("meal_bookings")
      .select("user_id, meal_type, booking_date")
      .gte("booking_date", firstDay)
      .lte("booking_date", lastDay);

    const mealCounts: Record<string, number> = {};
    for (const b of bookings || []) {
      if (!b.user_id) continue;
      mealCounts[b.user_id] = (mealCounts[b.user_id] || 0) + 1;
    }

    // Load saved billing records from Supabase
    const { data: records } = await supabase
      .from("billing_records")
      .select("*")
      .eq("month_label", currentMonthLabel);

    const recordMap: Record<string, any> = {};
    for (const r of records || []) {
      recordMap[r.user_id] = r;
    }

    const entries: BillingEntry[] = students.map((s) => {
      const rec = recordMap[s.id];
      const meals = rec?.meals_override ?? mealCounts[s.id] ?? 0;
      const avgPrice = 200;
      const bill = rec?.bill_override ?? meals * avgPrice;
      const paid = rec?.paid ?? 0;
      const status: "paid" | "partial" | "unpaid" = paid >= bill && bill > 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
      return { name: s.name, roll: s.roll_number, meals, bill, paid, status };
    });

    setBillingData(entries);
  }, [students, currentMonthLabel]);

  const fetchBillingHistory = useCallback(async () => {
    const { data } = await supabase
      .from("billing_history")
      .select("*")
      .order("archived_at", { ascending: false })
      .limit(4);
    if (data) {
      setBillingHistory(data.map((d: any) => ({ month: d.month_label, data: d.snapshot as BillingEntry[] })));
    }
  }, []);

  useEffect(() => {
    if (students.length > 0) fetchBillingData();
  }, [students, fetchBillingData]);

  useEffect(() => {
    fetchBillingHistory();
  }, [fetchBillingHistory]);

  // Persist billing change to Supabase
  const saveBillingRecord = async (roll: string, updates: { paid?: number; meals_override?: number; bill_override?: number }) => {
    const student = students.find((s) => s.roll_number === roll);
    if (!student) return;
    await supabase
      .from("billing_records")
      .upsert({
        user_id: student.id,
        month_label: currentMonthLabel,
        ...updates,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,month_label" });
  };

  const togglePaid = async (roll: string) => {
    const entry = billingData.find((s) => s.roll === roll);
    if (!entry) return;
    const newPaid = entry.status === "paid" ? 0 : entry.bill;
    await saveBillingRecord(roll, { paid: newPaid });
    setBillingData((prev) =>
      prev.map((s) => {
        if (s.roll !== roll) return s;
        const status = newPaid >= s.bill && s.bill > 0 ? "paid" as const : newPaid > 0 ? "partial" as const : "unpaid" as const;
        return { ...s, paid: newPaid, status };
      })
    );
  };

  const updatePaidAmount = async (roll: string, amount: number) => {
    const entry = billingData.find((s) => s.roll === roll);
    if (!entry) return;
    const clamped = Math.max(0, Math.min(amount, entry.bill));
    await saveBillingRecord(roll, { paid: clamped });
    setBillingData((prev) =>
      prev.map((s) => {
        if (s.roll !== roll) return s;
        const status = clamped >= s.bill ? "paid" as const : clamped > 0 ? "partial" as const : "unpaid" as const;
        return { ...s, paid: clamped, status };
      })
    );
  };

  const handleResetMonth = async () => {
    // Archive current month to billing_history
    await supabase
      .from("billing_history")
      .upsert({ month_label: currentMonthLabel, snapshot: JSON.parse(JSON.stringify(billingData)) } as any, { onConflict: "month_label" });

    // Delete current month's billing records
    await supabase
      .from("billing_records")
      .delete()
      .eq("month_label", currentMonthLabel);

    setBillingData((prev) => prev.map((s) => ({ ...s, paid: 0, status: "unpaid" as const })));
    setShowResetConfirm(false);
    await fetchBillingHistory();
    toast({ title: "Month archived and billing reset" });
  };

  const updateBillField = async (roll: string, field: "meals" | "bill", value: number) => {
    const val = Math.max(0, value);
    if (field === "meals") {
      await saveBillingRecord(roll, { meals_override: val });
    } else {
      await saveBillingRecord(roll, { bill_override: val });
    }
    setBillingData((prev) =>
      prev.map((s) => {
        if (s.roll !== roll) return s;
        const updated = { ...s, [field]: val };
        if (field === "bill") {
          const status = updated.paid >= updated.bill && updated.bill > 0 ? "paid" as const : updated.paid > 0 ? "partial" as const : "unpaid" as const;
          return { ...updated, status };
        }
        return updated;
      })
    );
  };

  const displayData = viewingMonth
    ? billingHistory.find((h) => h.month === viewingMonth)?.data || []
    : billingData;

  const totalBilled = displayData.reduce((a, s) => a + s.bill, 0);
  const totalCollected = displayData.reduce((a, s) => a + s.paid, 0);
  const totalPending = totalBilled - totalCollected;

  const statusColors = {
    paid: "bg-success/10 text-success border-success/20",
    partial: "bg-warning/10 text-warning border-warning/20",
    unpaid: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const renderBilling = () => (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.header variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-1">Finance</p>
          <h1 className="text-2xl font-extrabold text-foreground">
            {viewingMonth ? `📁 ${viewingMonth}` : `Monthly Billing — ${getCurrentMonthLabel()}`}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {viewingMonth && (
            <button
              onClick={() => setViewingMonth(null)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-secondary text-foreground border border-border hover:bg-secondary/80 transition-all"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back to Current
            </button>
          )}
          {!viewingMonth && (
            <>
              <button
                onClick={async () => {
                  const newVal = !appSettings.billVisibleToStudents;
                  await supabase.from("app_settings").update({ bill_visible_to_students: newVal, updated_at: new Date().toISOString() } as any).eq("id", 1);
                  setAppSettings({ ...appSettings, billVisibleToStudents: newVal });
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm border ${
                  appSettings.billVisibleToStudents
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-secondary text-muted-foreground border-border"
                }`}
              >
                {appSettings.billVisibleToStudents ? <><Eye className="h-3.5 w-3.5" /> Visible</> : <><EyeOff className="h-3.5 w-3.5" /> Hidden</>}
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Month
              </button>
            </>
          )}
        </div>
      </motion.header>

      {/* Reset confirmation */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <p className="text-sm text-destructive font-semibold">
              Archive <strong>{getCurrentMonthLabel()}</strong> billing and reset all to zero?
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setShowResetConfirm(false)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-secondary text-muted-foreground border border-border">Cancel</button>
              <button onClick={handleResetMonth} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-destructive text-destructive-foreground">Confirm Reset</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Past months history */}
      {billingHistory.length > 0 && !viewingMonth && (
        <motion.div variants={item} className="flex items-center gap-2 flex-wrap">
          <Archive className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Past:</span>
          {billingHistory.map((h) => (
            <button
              key={h.month}
              onClick={() => setViewingMonth(h.month)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-secondary text-muted-foreground border border-border hover:bg-accent hover:text-accent-foreground transition-all"
            >
              {h.month}
            </button>
          ))}
        </motion.div>
      )}

      {/* Summary Cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Billed</p>
          <p className="text-xl font-extrabold text-foreground tabular-nums">Rs. {totalBilled.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-success/20 bg-success/5 p-4 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-widest text-success mb-1">Collected</p>
          <p className="text-xl font-extrabold text-success tabular-nums">Rs. {totalCollected.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-widest text-destructive mb-1">Pending</p>
          <p className="text-xl font-extrabold text-destructive tabular-nums">Rs. {totalPending.toLocaleString()}</p>
        </div>
      </motion.div>

      <motion.div variants={item} className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="w-full text-left text-sm min-w-[700px]">
          <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
            <tr>
              <th className="px-5 py-4 font-bold">Student</th>
              <th className="px-5 py-4 font-bold">Roll No</th>
              <th className="px-5 py-4 font-bold">Meals</th>
              <th className="px-5 py-4 font-bold text-right">Bill</th>
              <th className="px-5 py-4 font-bold text-right">Paid</th>
              <th className="px-5 py-4 font-bold text-center">Status</th>
              {!viewingMonth && <th className="px-5 py-4 font-bold text-center">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayData.map((s) => (
              <tr key={s.roll} className="hover:bg-secondary/30 transition-colors duration-150">
                <td className="px-5 py-4 font-semibold text-foreground">{s.name}</td>
                <td className="px-5 py-4 font-mono text-muted-foreground text-xs">{s.roll}</td>
                <td className="px-5 py-4 tabular-nums text-muted-foreground">
                  {viewingMonth ? s.meals : (
                    <input type="number" value={s.meals} onChange={(e) => updateBillField(s.roll, "meals", Number(e.target.value))} className="w-16 text-sm font-bold tabular-nums bg-transparent border border-border rounded-md px-2 py-1 outline-none focus:border-accent text-foreground" />
                  )}
                </td>
                <td className="px-5 py-4 text-right font-bold text-foreground tabular-nums">
                  {viewingMonth ? `Rs. ${s.bill.toLocaleString()}` : (
                    <input type="number" value={s.bill} onChange={(e) => updateBillField(s.roll, "bill", Number(e.target.value))} className="w-24 text-right text-sm font-bold tabular-nums bg-transparent border border-border rounded-md px-2 py-1 outline-none focus:border-accent text-foreground" />
                  )}
                </td>
                <td className="px-5 py-4 text-right">
                  {viewingMonth ? (
                    <span className="font-bold tabular-nums text-foreground">Rs. {s.paid.toLocaleString()}</span>
                  ) : (
                    <input
                      type="number"
                      value={s.paid}
                      onChange={(e) => updatePaidAmount(s.roll, Number(e.target.value))}
                      className="w-20 text-right text-sm font-bold tabular-nums bg-transparent border border-border rounded-md px-2 py-1 outline-none focus:border-accent text-foreground"
                    />
                  )}
                </td>
                <td className="px-5 py-4 text-center">
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusColors[s.status]}`}>
                    {s.status}
                  </span>
                </td>
                {!viewingMonth && (
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => togglePaid(s.roll)}
                      className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all duration-200 ${
                        s.status === "paid"
                          ? "bg-secondary text-muted-foreground hover:bg-secondary/80"
                          : "bg-success text-success-foreground hover:brightness-110"
                      }`}
                    >
                      {s.status === "paid" ? "Undo" : "Mark Paid"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );

  const handleAddItem = (dayIndex: number, meal: MealType) => {
    if (!newItem.trim()) return;
    const updated = { ...weeklyMenu, days: weeklyMenu.days.map((d, i) => {
      if (i !== dayIndex) return d;
      return { ...d, [meal]: { ...d[meal], items: [...d[meal].items, newItem.trim()] } };
    })};
    setWeeklyMenu(updated);
    setNewItem("");
  };

  const handleRemoveItem = (dayIndex: number, meal: MealType, itemIndex: number) => {
    const updated = { ...weeklyMenu, days: weeklyMenu.days.map((d, i) => {
      if (i !== dayIndex) return d;
      return { ...d, [meal]: { ...d[meal], items: d[meal].items.filter((_, idx) => idx !== itemIndex) } };
    })};
    setWeeklyMenu(updated);
  };

  const handleSaveMenu = async () => {
    const success = await saveMenuToSupabase(weeklyMenu);
    if (success) {
      setMenuSaved(true);
      setTimeout(() => setMenuSaved(false), 2000);
    } else {
      alert("Failed to save menu. Please try again.");
    }
  };

  const renderMenu = () => (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.header variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-1">Menu</p>
          <h1 className="text-2xl font-extrabold text-foreground">Weekly Menu Planner</h1>
          <p className="text-sm text-muted-foreground mt-1">Plan meals for the week and set pricing.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 shadow-card">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Defaults</span>
            {(["breakfast", "lunch", "dinner"] as const).map((meal) => (
              <div key={meal} className="flex items-center gap-1 ml-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase">{meal[0].toUpperCase()}</span>
                <span className="text-muted-foreground text-[10px]">Rs.</span>
                <input
                  type="number"
                  value={weeklyMenu.defaultPrices[meal]}
                  onChange={(e) => setWeeklyMenu({ ...weeklyMenu, defaultPrices: { ...weeklyMenu.defaultPrices, [meal]: Number(e.target.value) } })}
                  className="w-12 bg-transparent text-xs font-bold text-foreground outline-none tabular-nums"
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleSaveMenu}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm ${
              menuSaved
                ? "bg-success text-success-foreground"
                : "bg-primary text-primary-foreground hover:brightness-110"
            }`}
          >
            {menuSaved ? <><CheckCircle2 className="h-3.5 w-3.5" /> Saved</> : <><Save className="h-3.5 w-3.5" /> Publish Menu</>}
          </button>
        </div>
      </motion.header>

      <div className="space-y-4">
        {weeklyMenu.days.map((day, dayIndex) => (
          <motion.div
            key={day.day}
            variants={item}
            className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
          >
            <div className="bg-secondary/40 px-5 py-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">{day.day}</h3>
            </div>
            <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
              {(["breakfast", "lunch", "dinner"] as MealType[]).map((meal) => {
                const isEditing = editingCell?.day === dayIndex && editingCell?.meal === meal;
                return (
                  <div key={meal} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {meal}
                        </p>
                        <div className="flex items-center gap-0.5 bg-accent/10 rounded px-1.5 py-0.5">
                          <span className="text-[9px] text-accent">Rs.</span>
                          <input
                            type="number"
                            value={day[meal].price}
                            onChange={(e) => {
                              const updated = { ...weeklyMenu, days: weeklyMenu.days.map((d, i) => {
                                if (i !== dayIndex) return d;
                                return { ...d, [meal]: { ...d[meal], price: Number(e.target.value) } };
                              })};
                              setWeeklyMenu(updated);
                            }}
                            className="w-10 bg-transparent text-[11px] font-bold text-accent outline-none tabular-nums"
                          />
                        </div>
                        {day[meal].price !== weeklyMenu.defaultPrices[meal] && (
                          <span className="text-[8px] font-bold text-warning bg-warning/10 px-1 py-0.5 rounded">CUSTOM</span>
                        )}
                      </div>
                      <button
                        onClick={() => setEditingCell(isEditing ? null : { day: dayIndex, meal })}
                        className="text-[10px] font-bold text-accent hover:underline"
                      >
                        {isEditing ? "Done" : "Edit"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {day[meal].items.map((itm, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-xs font-medium bg-secondary text-secondary-foreground px-2.5 py-1 rounded-md"
                        >
                          {itm}
                          {isEditing && (
                            <button onClick={() => handleRemoveItem(dayIndex, meal, idx)} className="text-destructive hover:text-destructive/80">
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                    {isEditing && (
                      <form
                        onSubmit={(e) => { e.preventDefault(); handleAddItem(dayIndex, meal); }}
                        className="mt-2 flex gap-1.5"
                      >
                        <input
                          type="text"
                          value={newItem}
                          onChange={(e) => setNewItem(e.target.value)}
                          placeholder="Add item…"
                          className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-input bg-background outline-none focus:border-accent"
                          autoFocus
                        />
                        <button type="submit" className="p-1.5 rounded-md bg-accent text-accent-foreground">
                          <Plus className="h-3 w-3" />
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  // --- Students Management ---
  const handleAddStudent = async () => {
    if (!newStudent.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (!newStudent.roll_number.trim()) { toast({ title: "Roll number is required", variant: "destructive" }); return; }
    if (!newStudent.pin.trim() || newStudent.pin.trim().length < 6) { toast({ title: "PIN must be at least 6 characters", variant: "destructive" }); return; }
    if (newStudent.role === "student" && !newStudent.hostel_id) { toast({ title: "Please select a hostel", variant: "destructive" }); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast({ title: "Session expired, please login again", variant: "destructive" }); return; }
    const response = await supabase.functions.invoke("manage-user", {
      body: {
        action: "create",
        name: newStudent.name,
        roll_number: newStudent.roll_number,
        pin: newStudent.pin,
        hostel_id: newStudent.role === "student" ? newStudent.hostel_id : null,
        role: newStudent.role,
      },
    });
    if (response.error || response.data?.error) {
      toast({ title: "Failed to add user", description: response.data?.error || response.error?.message, variant: "destructive" });
    } else {
      toast({ title: "User added successfully" });
      await fetchStudents();
      setNewStudent({ name: "", roll_number: "", pin: "", hostel_id: "", role: "student" });
      setShowAddStudent(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    const response = await supabase.functions.invoke("manage-user", {
      body: { action: "delete", user_id: id },
    });
    if (!response.error) await fetchStudents();
  };

  const handleChangePin = async (userId: string) => {
    if (!newPinValue || newPinValue.length < 6) return;
    setPinChangeLoading(true);
    const response = await supabase.functions.invoke("manage-user", {
      body: { action: "change_pin", user_id: userId, new_pin: newPinValue },
    });
    setPinChangeLoading(false);
    if (!response.error && !response.data?.error) {
      setChangePinUser(null);
      setNewPinValue("");
    }
  };

  const handleBatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const startIdx = lines[0]?.toLowerCase().includes("name") ? 1 : 0;
      const existingRolls = new Set(students.map((s) => s.roll_number.toLowerCase()));
      const toCreate: { name: string; roll_number: string; pin: string; hostel_id: number | null }[] = [];
      let skipped = 0;
      for (let i = startIdx; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        if (cols.length < 4) { skipped++; continue; }
        const [name, roll_number, pin, hostel_id] = cols;
        if (!name || !roll_number || !pin || !hostel_id) { skipped++; continue; }
        if (existingRolls.has(roll_number.toLowerCase())) { skipped++; continue; }
        const matchedHostel = hostels.find((h) => String(h.id) === hostel_id || h.name.toLowerCase() === hostel_id.toLowerCase());
        if (!matchedHostel) { skipped++; continue; }
        toCreate.push({ name, roll_number, pin, hostel_id: matchedHostel.id });
        existingRolls.add(roll_number.toLowerCase());
      }
      if (toCreate.length > 0) {
        const response = await supabase.functions.invoke("manage-user", {
          body: { action: "batch_create", students: toCreate },
        });
        const result = response.data || { added: 0, skipped: 0 };
        setBatchUploadResult({ added: result.added, skipped: result.skipped + skipped });
      } else {
        setBatchUploadResult({ added: 0, skipped });
      }
      await fetchStudents();
      setTimeout(() => setBatchUploadResult(null), 4000);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const renderStudents = () => (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.header variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-1">Management</p>
          <h1 className="text-2xl font-extrabold text-foreground">Students</h1>
          <p className="text-sm text-muted-foreground mt-1">{students.length} registered students</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={batchFileRef} type="file" accept=".csv" onChange={handleBatchUpload} className="hidden" />
          <button
            onClick={() => batchFileRef.current?.click()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-secondary text-foreground border border-border shadow-sm hover:bg-secondary/80 transition-all"
          >
            <Upload className="h-3.5 w-3.5" /> Batch Upload
          </button>
          <button
            onClick={() => setShowAddStudent(!showAddStudent)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground shadow-sm hover:brightness-110 transition-all"
          >
            <UserPlus className="h-3.5 w-3.5" /> Add User
          </button>
        </div>
      </motion.header>

      {batchUploadResult && (
        <motion.div variants={item} className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <p className="text-sm text-foreground">
            <span className="font-bold">{batchUploadResult.added}</span> students added
            {batchUploadResult.skipped > 0 && <>, <span className="font-bold">{batchUploadResult.skipped}</span> skipped (duplicates or invalid)</>}
          </p>
        </motion.div>
      )}

      {showAddStudent && (
        <motion.div variants={item} className="rounded-xl border border-border bg-card p-5 shadow-card space-y-4">
          <h3 className="text-sm font-bold text-foreground">New User</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              type="text" placeholder="Full Name" value={newStudent.name}
              onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
              className="text-sm px-3 py-2.5 rounded-lg border border-input bg-background outline-none focus:border-accent text-foreground"
            />
            <input
              type="text" placeholder="Roll Number / Username" value={newStudent.roll_number}
              onChange={(e) => setNewStudent({ ...newStudent, roll_number: e.target.value })}
              className="text-sm px-3 py-2.5 rounded-lg border border-input bg-background outline-none focus:border-accent text-foreground"
            />
            <input
              type="text" placeholder="PIN (min 6 characters)" value={newStudent.pin} minLength={6}
              onChange={(e) => setNewStudent({ ...newStudent, pin: e.target.value })}
              className="text-sm px-3 py-2.5 rounded-lg border border-input bg-background outline-none focus:border-accent text-foreground"
            />
            <select
              value={newStudent.role}
              onChange={(e) => setNewStudent({ ...newStudent, role: e.target.value as "student" | "admin" })}
              className="text-sm px-3 py-2.5 rounded-lg border border-input bg-background outline-none focus:border-accent text-foreground"
            >
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
            {newStudent.role === "student" && (
              <select
                value={newStudent.hostel_id}
                onChange={(e) => setNewStudent({ ...newStudent, hostel_id: e.target.value })}
                className="text-sm px-3 py-2.5 rounded-lg border border-input bg-background outline-none focus:border-accent text-foreground"
              >
                <option value="">Select Hostel</option>
                {hostels.map((h) => (
                  <option key={h.id} value={h.id}>{h.name} ({h.type})</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddStudent} className="px-4 py-2 rounded-lg text-xs font-bold uppercase bg-accent text-accent-foreground hover:brightness-110 transition-all">
              Save
            </button>
            <button onClick={() => setShowAddStudent(false)} className="px-4 py-2 rounded-lg text-xs font-bold uppercase bg-secondary text-muted-foreground hover:bg-secondary/80 transition-all">
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      <motion.div variants={item} className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="w-full text-left text-sm min-w-[600px]">
          <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
            <tr>
              <th className="px-5 py-4 font-bold">Name</th>
              <th className="px-5 py-4 font-bold">Roll No</th>
              <th className="px-5 py-4 font-bold">Role</th>
              <th className="px-5 py-4 font-bold">Hostel</th>
              <th className="px-5 py-4 font-bold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((s) => {
              const hostel = hostels.find((h) => h.id === s.hostel_id);
              const role = userRoles[s.id] || "student";
              return (
                <tr key={s.id} className="hover:bg-secondary/30 transition-colors duration-150">
                  <td className="px-5 py-4 font-semibold text-foreground">{s.name}</td>
                  <td className="px-5 py-4 font-mono text-muted-foreground text-xs">{s.roll_number}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      role === "admin"
                        ? "bg-accent/10 text-accent border-accent/20"
                        : "bg-secondary text-muted-foreground border-border"
                    }`}>
                      {role === "admin" && <ShieldCheck className="h-3 w-3" />}
                      {role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{hostel?.name ?? "—"}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {changePinUser === s.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="password"
                            placeholder="New PIN (6+)"
                            value={newPinValue}
                            onChange={(e) => setNewPinValue(e.target.value)}
                            className="w-28 text-xs px-2 py-1.5 rounded-md border border-input bg-background outline-none focus:border-accent text-foreground"
                            autoFocus
                          />
                          <button
                            onClick={() => handleChangePin(s.id)}
                            disabled={pinChangeLoading || newPinValue.length < 6}
                            className="text-[10px] font-bold uppercase px-2 py-1.5 rounded-md bg-accent text-accent-foreground hover:brightness-110 disabled:opacity-50 transition-all"
                          >
                            {pinChangeLoading ? "…" : "Save"}
                          </button>
                          <button
                            onClick={() => { setChangePinUser(null); setNewPinValue(""); }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setChangePinUser(s.id); setNewPinValue(""); }}
                          className="text-muted-foreground hover:text-accent transition-colors"
                          title="Change PIN"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => handleDeleteStudent(s.id)} className="text-destructive/60 hover:text-destructive transition-colors" title="Delete user">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );

  // --- Hostels Management ---
  const handleAddHostel = async () => {
    if (!newHostel.name.trim()) return;
    const { error } = await supabase.from("hostels").insert({
      name: newHostel.name,
      type: newHostel.type,
    });
    if (!error) {
      await fetchHostels();
      setNewHostel({ name: "", type: "boys" });
      setShowAddHostel(false);
    }
  };

  const handleDeleteHostel = async (id: number) => {
    await supabase.from("hostels").delete().eq("id", id);
    await fetchHostels();
  };

  const renderHostels = () => (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.header variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-1">Management</p>
          <h1 className="text-2xl font-extrabold text-foreground">Hostels</h1>
          <p className="text-sm text-muted-foreground mt-1">{hostels.length} registered hostels</p>
        </div>
        <button
          onClick={() => setShowAddHostel(!showAddHostel)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground shadow-sm hover:brightness-110 transition-all"
        >
          <Plus className="h-3.5 w-3.5" /> Add Hostel
        </button>
      </motion.header>

      {showAddHostel && (
        <motion.div variants={item} className="rounded-xl border border-border bg-card p-5 shadow-card space-y-4">
          <h3 className="text-sm font-bold text-foreground">New Hostel</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              type="text" placeholder="Hostel Name" value={newHostel.name}
              onChange={(e) => setNewHostel({ ...newHostel, name: e.target.value })}
              className="text-sm px-3 py-2.5 rounded-lg border border-input bg-background outline-none focus:border-accent text-foreground"
            />
            <select
              value={newHostel.type}
              onChange={(e) => setNewHostel({ ...newHostel, type: e.target.value as "boys" | "girls" | "mixed" })}
              className="text-sm px-3 py-2.5 rounded-lg border border-input bg-background outline-none focus:border-accent text-foreground"
            >
              <option value="boys">Boys</option>
              <option value="girls">Girls</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddHostel} className="px-4 py-2 rounded-lg text-xs font-bold uppercase bg-accent text-accent-foreground hover:brightness-110 transition-all">
              Save
            </button>
            <button onClick={() => setShowAddHostel(false)} className="px-4 py-2 rounded-lg text-xs font-bold uppercase bg-secondary text-muted-foreground hover:bg-secondary/80 transition-all">
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {hostels.map((h) => {
          const hostelStudents = students.filter((s) => s.hostel_id === h.id);
          return (
            <motion.div key={h.id} variants={item} className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Home className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{h.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{h.type} hostel</p>
                  </div>
                </div>
                <button onClick={() => handleDeleteHostel(h.id)} className="text-destructive/40 hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-bold text-muted-foreground">{hostelStudents.length} students</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { key: "students" as const, label: "Students", icon: Users },
    { key: "hostels" as const, label: "Hostels", icon: Building2 },
    { key: "scanner" as const, label: "Scanner", icon: ScanLine },
    { key: "menu" as const, label: "Menu", icon: UtensilsCrossed },
    { key: "billing" as const, label: "Billing", icon: Receipt },
  ];

  return (
    <main className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-sidebar border-b md:border-b-0 md:border-r border-sidebar-border flex flex-col flex-shrink-0">
        <div className="p-4 md:p-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Users className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-extrabold text-sidebar-foreground leading-tight text-sm">FAST NUCES</h2>
            <p className="text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-widest">Multan Campus</p>
          </div>
          {/* Mobile logout */}
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
            className="md:hidden flex items-center justify-center rounded-lg p-2 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible scrollbar-none">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 md:gap-3 rounded-lg px-3 md:px-3.5 py-2 md:py-2.5 text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === key
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 mt-auto hidden md:flex flex-col gap-2 border-t border-sidebar-border">
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors duration-200"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Content */}
      <section className="flex-1 p-5 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === "overview" && <div key="overview">{renderOverview()}</div>}
            {activeTab === "students" && <div key="students">{renderStudents()}</div>}
            {activeTab === "hostels" && <div key="hostels">{renderHostels()}</div>}
            {activeTab === "scanner" && <div key="scanner">{renderScanner()}</div>}
            {activeTab === "menu" && <div key="menu">{renderMenu()}</div>}
            {activeTab === "billing" && <div key="billing">{renderBilling()}</div>}
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}
