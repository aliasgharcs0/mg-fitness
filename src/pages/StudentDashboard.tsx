import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import QRCode from "react-qr-code";
import {
  User,
  Coffee,
  Utensils,
  UtensilsCrossed,
  Lock,
  Wallet,
  LogOut,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Loader2,
  Check,
} from "lucide-react";
import { fetchMenuFromSupabase, type WeeklyMenu, type MealType, DAYS_OF_WEEK, type DayOfWeek, DEFAULT_WEEKLY_MENU } from "@/lib/menuData";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";

const MEAL_ICONS: Record<MealType, typeof Coffee> = { breakfast: Coffee, lunch: Utensils, dinner: UtensilsCrossed };

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// Get dates for the current week (Mon-Sun)
function getWeekDates(): { day: DayOfWeek; date: string; label: string; isToday: boolean; isPast: boolean }[] {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const currentDay = now.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  return DAYS_OF_WEEK.map((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const isToday = dateStr === todayStr;
    // Today is always locked. Tomorrow locks at 8 PM. Past days are locked.
    const isPast = dateStr <= todayStr || (dateStr === tomorrowStr && now.getHours() >= 20);
    return { day, date: dateStr, label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), isToday, isPast };
  });
}

type WeekBookings = Record<string, Set<MealType>>; // date -> set of meals

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu>(DEFAULT_WEEKLY_MENU);
  const [saving, setSaving] = useState(false);
  const [billVisible, setBillVisible] = useState(false);
  const [monthlyBill, setMonthlyBill] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [weekBookings, setWeekBookings] = useState<WeekBookings>({});
  const [selectedDay, setSelectedDay] = useState<string>("");

  const weekDates = getWeekDates();

  // Set initial selected day to today or first future day
  useEffect(() => {
    const today = weekDates.find((d) => d.isToday);
    const firstFuture = weekDates.find((d) => !d.isPast);
    setSelectedDay(today?.date || firstFuture?.date || weekDates[0].date);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) { navigate("/login"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", authSession.user.id);
      const isAdmin = roles?.some((r: any) => r.role === "admin");
      if (isAdmin) { navigate("/admin"); return; }
      const { data: profile } = await supabase.from("users").select("*").eq("id", authSession.user.id).single();
      if (profile) {
        setSession({ ...profile, id: authSession.user.id });
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    fetchMenuFromSupabase().then(setWeeklyMenu);
    supabase.from("app_settings").select("bill_visible_to_students").eq("id", 1).single().then(({ data }) => {
      if (data) setBillVisible(data.bill_visible_to_students);
    });
  }, []);

  // Load all bookings for the week
  useEffect(() => {
    if (!session) return;
    const loadWeekBookings = async () => {
      const dates = weekDates.map((d) => d.date);
      const { data } = await supabase
        .from("meal_bookings")
        .select("meal_type, booking_date")
        .eq("user_id", session.id)
        .gte("booking_date", dates[0])
        .lte("booking_date", dates[dates.length - 1]);

      const bookings: WeekBookings = {};
      (data || []).forEach((b: any) => {
        if (!bookings[b.booking_date]) bookings[b.booking_date] = new Set();
        bookings[b.booking_date].add(b.meal_type as MealType);
      });
      setWeekBookings(bookings);
    };
    loadWeekBookings();
  }, [session]);

  // Monthly bill
  useEffect(() => {
    if (!session) return;
    const fetchMonthlyBill = async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      const { data: billingRec } = await supabase
        .from("billing_records")
        .select("bill_override, meals_override, paid")
        .eq("user_id", session.id)
        .eq("month_label", now.toLocaleDateString("en-US", { month: "long", year: "numeric" }))
        .maybeSingle();
      if (billingRec?.bill_override != null) { setMonthlyBill(billingRec.bill_override); return; }
      const { data: bookings } = await supabase
        .from("meal_bookings")
        .select("meal_type")
        .eq("user_id", session.id)
        .gte("booking_date", firstDay)
        .lte("booking_date", lastDay);
      const mealCount = billingRec?.meals_override ?? (bookings?.length || 0);
      setMonthlyBill(mealCount * 200);
    };
    fetchMonthlyBill();
  }, [session]);

  const toggleMeal = (date: string, meal: MealType) => {
    const dayInfo = weekDates.find((d) => d.date === date);
    if (dayInfo?.isPast) return;
    setWeekBookings((prev) => {
      const updated = { ...prev };
      if (!updated[date]) updated[date] = new Set();
      else updated[date] = new Set(updated[date]);
      if (updated[date].has(meal)) updated[date].delete(meal);
      else updated[date].add(meal);
      return updated;
    });
  };

  const handleSavePreferences = async () => {
    if (!session) return;
    setSaving(true);
    const userId = session.id;
    const futureDates = weekDates.filter((d) => !d.isPast).map((d) => d.date);

    // Delete existing bookings for future dates
    for (const date of futureDates) {
      await supabase.from("meal_bookings").delete().eq("user_id", userId).eq("booking_date", date);
    }

    // Insert all selected meals for future dates
    const inserts: { user_id: string; meal_type: string; booking_date: string; status: string }[] = [];
    for (const date of futureDates) {
      const meals = weekBookings[date];
      if (meals) {
        meals.forEach((meal) => {
          inserts.push({ user_id: userId, meal_type: meal, booking_date: date, status: "booked" });
        });
      }
    }
    if (inserts.length > 0) {
      await supabase.from("meal_bookings").insert(inserts);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (!session) return null;

  const selectedDayInfo = weekDates.find((d) => d.date === selectedDay);
  const selectedDayMenu = weeklyMenu.days.find((d) => d.day === selectedDayInfo?.day);
  const selectedBookings = weekBookings[selectedDay] || new Set();

  const meals: { key: MealType; label: string; time: string; icon: typeof Coffee }[] = [
    { key: "breakfast", label: "Breakfast", time: "7:30 – 9:30 AM", icon: Coffee },
    { key: "lunch", label: "Lunch", time: "1:00 – 3:00 PM", icon: Utensils },
    { key: "dinner", label: "Dinner", time: "7:30 – 9:30 PM", icon: UtensilsCrossed },
  ];

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-card min-h-[85vh] rounded-2xl shadow-elevated border border-border overflow-hidden flex flex-col relative"
      >
        {/* Header */}
        <header className="bg-primary text-primary-foreground p-6 pb-8 rounded-b-[1.5rem] shadow-lg z-10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-primary-foreground/60 text-xs font-semibold uppercase tracking-widest">Welcome back</p>
              <h1 className="text-xl font-extrabold tracking-tight mt-1">{session.name}</h1>
              <div className="flex items-center gap-1.5 mt-2 text-primary-foreground/70 bg-primary-foreground/10 w-fit px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold">
                <User className="h-3 w-3" /> {session.roll_number}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle className="text-primary-foreground/40 hover:text-primary-foreground hover:bg-primary-foreground/10" />
              <button onClick={handleLogout} className="text-primary-foreground/40 hover:text-primary-foreground transition-colors p-1">
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </header>

        {/* QR Card */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="px-5 -mt-5 z-20"
        >
          <div className="bg-card rounded-xl p-4 shadow-card-hover border border-border flex items-center gap-4">
            <div className="bg-background p-2.5 rounded-lg border border-border">
              <QRCode value={session.roll_number} size={52} className="rounded" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Digital Pass</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">Show at the mess if you forget your RFID card.</p>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div variants={container} initial="hidden" animate="show" className="flex-1 p-5 space-y-5 overflow-y-auto pb-24">
          {/* Bill Card */}
          {billVisible ? (
            <motion.div variants={item} className="bg-primary/8 border border-primary/15 rounded-xl p-5">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Wallet className="h-4 w-4" />
                <h2 className="text-xs font-bold uppercase tracking-widest">Current Bill Estimate</h2>
              </div>
              <p className="text-3xl font-extrabold text-foreground tabular-nums">Rs. {monthlyBill}</p>
            </motion.div>
          ) : (
            <motion.div variants={item} className="bg-secondary/50 border border-border rounded-xl p-4 flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-medium">Billing information is currently not available.</p>
            </motion.div>
          )}

          {/* Weekly Meal Selection */}
          <motion.div variants={item}>
            <h2 className="text-sm font-bold text-primary flex items-center gap-1.5 mb-3">
              <CalendarDays className="h-4 w-4" />
              Weekly Meal Selection
            </h2>

            {/* Week Day Tabs */}
            <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-none pb-1">
              {weekDates.map((wd) => {
                const bookedCount = (weekBookings[wd.date] || new Set()).size;
                return (
                  <button
                    key={wd.date}
                    onClick={() => setSelectedDay(wd.date)}
                    className={`flex-shrink-0 flex flex-col items-center py-2 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 min-w-[52px] ${
                      selectedDay === wd.date
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : wd.isPast
                        ? "bg-secondary/50 text-muted-foreground/50"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{wd.day.slice(0, 3)}</span>
                    <span className="text-[9px] mt-0.5 opacity-70">{wd.label}</span>
                    {bookedCount > 0 && (
                      <div className={`flex gap-0.5 mt-1`}>
                        {Array.from({ length: bookedCount }).map((_, i) => (
                          <div key={i} className={`h-1 w-1 rounded-full ${selectedDay === wd.date ? "bg-primary-foreground/60" : "bg-accent"}`} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedDayInfo?.isPast && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-4 flex items-start gap-2.5 bg-destructive/8 border border-destructive/15 text-destructive p-3 rounded-lg text-xs font-medium"
              >
                <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                <p><strong>Locked.</strong> This day's preferences can no longer be changed.</p>
              </motion.div>
            )}

            <div className="space-y-2.5">
              {meals.map(({ key, label, time, icon: Icon }) => {
                const isChecked = selectedBookings.has(key);
                const isLocked = !!selectedDayInfo?.isPast;
                return (
                  <label
                    key={key}
                    onClick={() => !isLocked && toggleMeal(selectedDay, key)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${
                      isChecked ? "border-accent bg-accent/5 shadow-sm" : "border-border bg-card"
                    } ${isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-accent/40"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors duration-200 ${
                        isChecked ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
                      }`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{label}</p>
                        <p className="text-[11px] text-muted-foreground">{time}</p>
                        {selectedDayMenu && (
                          <p className="text-[10px] text-accent mt-0.5">{selectedDayMenu[key].items.join(", ")}</p>
                        )}
                      </div>
                    </div>
                    <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                      isChecked ? "border-accent bg-accent" : "border-border"
                    }`}>
                      {isChecked && <Check className="h-3 w-3 text-accent-foreground" />}
                    </div>
                  </label>
                );
              })}
            </div>
          </motion.div>

          {/* Weekly Menu */}
          <motion.div variants={item}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-full flex items-center justify-between text-sm font-bold text-primary mb-3"
            >
              <span className="flex items-center gap-1.5">
                <UtensilsCrossed className="h-4 w-4" />
                Weekly Menu
              </span>
              {showMenu ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {showMenu && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-2.5"
              >
                {weeklyMenu.days.map((day) => (
                  <div key={day.day} className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="bg-secondary/40 px-3.5 py-2 border-b border-border">
                      <p className="text-xs font-bold text-foreground">{day.day}</p>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-border">
                      {(["breakfast", "lunch", "dinner"] as MealType[]).map((meal) => {
                        const Icon = MEAL_ICONS[meal];
                        return (
                          <div key={meal} className="p-2.5">
                            <div className="flex items-center gap-1 mb-1.5">
                              <Icon className="h-3 w-3 text-accent" />
                              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{meal}</p>
                            </div>
                            <div className="space-y-0.5">
                              {day[meal].items.map((itm, idx) => (
                                <p key={idx} className="text-[11px] text-foreground leading-tight">{itm}</p>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {/* Save Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-card via-card/95 to-transparent">
          <button
            disabled={saving}
            onClick={handleSavePreferences}
            className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-lg transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 text-sm flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save Week Preferences"}
          </button>
        </div>
      </motion.div>
    </main>
  );
}
