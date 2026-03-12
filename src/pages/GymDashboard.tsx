import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dumbbell,
  LayoutDashboard,
  Users,
  Activity,
  HeartPulse,
  Stethoscope,
  Phone,
  NotebookPen,
  CreditCard,
  Plus,
  UserRoundSearch,
  BadgeDollarSign,
  Menu,
  LogOut,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ThemeToggle from "@/components/ThemeToggle";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { gymImages } from "@/lib/gymImages";

const PLAN_OPTIONS = ["Weight Loss", "Weight Gain", "Custom"] as const;
const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced"] as const;

type MembershipStatus = "active" | "expired" | "pending";

type Member = {
  id: number;
  username?: string;
  name: string;
  email: string;
  phone: string;
  heightCm: number;
  weightKg: number;
  trainer: string;
  membership: string;
  dietPlanId?: number | null;
  paymentDay?: number;
  status: MembershipStatus;
  startDate: string;
  renewDate: string;
  injuryHistory: string;
  medicalNotes: string;
  balance: number;
  totalPaid: number;
  fees: number;
  role?: string;
};

type Program = {
  id: number;
  name: string;
  type: "Weight Loss" | "Weight Gain" | "Custom";
  level: "Beginner" | "Intermediate" | "Advanced";
  durationWeeks: number;
  sessionsPerWeek: number;
};

type DietPlan = {
  id: number;
  name: string;
  goal: "Weight Loss" | "Weight Gain" | "Custom";
  calories: number;
  notes: string;
  medical: string;
  earlyMorningRemedy: string;
  breakfast: string;
  snack1: string;
  lunch: string;
  snack2: string;
  dinner: string;
  snack3: string;
};

type Payment = {
  id: number;
  memberId: number;
  date: string;
  amount: number;
  method: "Cash" | "Card" | "Bank";
  type: "debit" | "credit";
  note: string;
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25 },
  },
};

const statusStyles: Record<MembershipStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  expired: "bg-red-500/10 text-red-500 border-red-500/30",
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/30",
};

const pageLoad = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.3, ease: "easeOut" },
};

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  // 11, 12, 13 -> th
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

type TabId = "dashboard" | "members" | "contacts" | "programs" | "diet" | "medical" | "payments";

export default function GymDashboard() {
  const { user, token, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [editingContactId, setEditingContactId] = useState<number | null>(null);
  const [contactEdit, setContactEdit] = useState<{ email: string; phone: string; trainer: string }>({ email: "", phone: "", trainer: "" });

  // Members only see Programs, Diet, Payments; default to Programs and redirect away from admin-only tabs
  useEffect(() => {
    if (!user || user.role === "admin") return;
    if (activeTab === "dashboard" || activeTab === "members" || activeTab === "contacts") {
      setActiveTab("programs");
    }
  }, [user, activeTab]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState({
    username: "",
    name: "",
    password: "",
    email: "",
    phone: "",
    membership: "",
    dietPlanId: null as number | null,
    paymentDay: 1,
    trainer: "",
    fees: 0,
  });
  const [addMemberSubmitting, setAddMemberSubmitting] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [editFees, setEditFees] = useState<{ balance: number; totalPaid: number }>({ balance: 0, totalPaid: 0 });
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editMemberForm, setEditMemberForm] = useState({
    username: "",
    name: "",
    email: "",
    phone: "",
    heightCm: 0,
    weightKg: 0,
    trainer: "",
    membership: "",
    dietPlanId: null as number | null,
    paymentDay: 1,
    newPassword: "",
    fees: 0,
  });
  const [editMemberSubmitting, setEditMemberSubmitting] = useState(false);
  const [editMemberError, setEditMemberError] = useState<string | null>(null);
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [addProgramForm, setAddProgramForm] = useState({
    name: "",
    type: "Custom" as (typeof PLAN_OPTIONS)[number],
    level: "Beginner" as (typeof LEVEL_OPTIONS)[number],
    durationWeeks: 12,
    sessionsPerWeek: 4,
  });
  const [addProgramSubmitting, setAddProgramSubmitting] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<number | null>(null);
  const [editProgramForm, setEditProgramForm] = useState<Program | null>(null);
  const [showAddDietPlan, setShowAddDietPlan] = useState(false);
  const [addDietForm, setAddDietForm] = useState({
    name: "",
    goal: "Custom" as (typeof PLAN_OPTIONS)[number],
    calories: 2000,
    notes: "",
    medical: "",
    earlyMorningRemedy: "",
    breakfast: "",
    snack1: "",
    lunch: "",
    snack2: "",
    dinner: "",
    snack3: "",
  });
  const [addDietSubmitting, setAddDietSubmitting] = useState(false);
  const [editingDietId, setEditingDietId] = useState<number | null>(null);
  const [editDietForm, setEditDietForm] = useState<DietPlan | null>(null);
  const [editingMedicalMemberId, setEditingMedicalMemberId] = useState<number | null>(null);
  const [medicalEditForm, setMedicalEditForm] = useState<{ injuryHistory: string; medicalNotes: string } | null>(null);
  const [removeMember, setRemoveMember] = useState<{ id: number; name: string } | null>(null);
  const [removeMemberSubmitting, setRemoveMemberSubmitting] = useState(false);
  const [removeMemberError, setRemoveMemberError] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<number | null>(null);

  const memberPlanOptions = useMemo(() => programs.map((p) => p.name), [programs]);

  const pageHeader = useMemo(() => {
    const isAdmin = user?.role === "admin";
    const tabs: Record<TabId, { badge: string; title: string; description: string }> = {
      dashboard: {
        badge: "Dashboard",
        title: "Members & Programs Overview",
        description: "Track memberships, programs, diet plans and payments in one place.",
      },
      members: {
        badge: "Members",
        title: "Members",
        description: "Manage gym members, add and edit accounts.",
      },
      contacts: {
        badge: "Contacts",
        title: "Contact Information",
        description: "Edit member contact details.",
      },
      programs: {
        badge: "Programs",
        title: "Programs",
        description: isAdmin ? "Training programs and plans." : "Your training program details.",
      },
      diet: {
        badge: "Diet",
        title: "Diet Plans",
        description: isAdmin ? "Diet plans." : "Your diet plan.",
      },
      medical: {
        badge: "Medical",
        title: "Medical & Injury History",
        description: isAdmin ? "Member injury and medical notes." : "Your medical and injury notes.",
      },
      payments: {
        badge: "Payments",
        title: "Payments Pending",
        description: isAdmin ? "Members with outstanding balance and payment dates." : "Your outstanding balance and payment date.",
      },
    };
    return tabs[activeTab] ?? tabs.dashboard;
  }, [activeTab, user?.role]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const authHeaders = { Authorization: `Bearer ${token}` };

          const [membersRes, programsRes, dietsRes, paymentsRes] = await Promise.all([
            apiFetch(`/api/members`, { headers: authHeaders }),
            apiFetch(`/api/programs`),
            apiFetch(`/api/diet-plans`),
            apiFetch(`/api/payments`, { headers: authHeaders }),
          ]);

        if (!membersRes.ok || !programsRes.ok || !dietsRes.ok || !paymentsRes.ok) {
          throw new Error("Failed to load data from local API");
        }

        const membersJson = await membersRes.json();
        const programsJson = await programsRes.json();
        const dietsJson = await dietsRes.json();
        const paymentsJson = await paymentsRes.json();

        setMembers(
          (Array.isArray(membersJson) ? membersJson.filter((m: any) => m.role !== "admin") : []).map((m: any): Member => ({
            id: m.id,
            username: m.username,
            name: m.name,
            email: m.email ?? "",
            phone: m.phone ?? "",
            heightCm: m.height_cm ?? 0,
            weightKg: m.weight_kg ?? 0,
            trainer: m.trainer ?? "",
            membership: m.membership ?? "Custom",
            dietPlanId: m.diet_plan_id ?? null,
            paymentDay: m.payment_day ?? 1,
            status: m.status ?? "active",
            startDate: m.start_date ?? "",
            renewDate: m.renew_date ?? "",
            injuryHistory: m.injury_history ?? "",
            medicalNotes: m.medical_notes ?? "",
            balance: m.balance ?? 0,
            totalPaid: m.total_paid ?? 0,
            fees: m.fees ?? 0,
            role: m.role,
          })),
        );

        setPrograms(
          programsJson.map((p: any): Program => ({
            id: p.id,
            name: p.name,
            type: p.type ?? "Custom",
            level: p.level ?? "Beginner",
            durationWeeks: p.duration_weeks ?? 0,
            sessionsPerWeek: p.sessions_per_week ?? 0,
          })),
        );

        setDietPlans(
          dietsJson.map((d: any): DietPlan => ({
            id: d.id,
            name: d.name,
            goal: d.goal ?? "Custom",
            calories: d.calories ?? 0,
            notes: d.notes ?? "",
            medical: d.medical ?? "",
            earlyMorningRemedy: d.early_morning_remedy ?? "",
            breakfast: d.breakfast ?? "",
            snack1: d.snack_1 ?? "",
            lunch: d.lunch ?? "",
            snack2: d.snack_2 ?? "",
            dinner: d.dinner ?? "",
            snack3: d.snack_3 ?? "",
          })),
        );

        setPayments(
          paymentsJson.map((p: any): Payment => ({
            id: p.id,
            memberId: p.member_id,
            date: p.date,
            amount: p.amount,
            method: p.method,
            type: p.type,
            note: p.note,
          })),
        );
      } catch (e: any) {
        setError(e.message || "Something went wrong while loading data");
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === "admin") {
      load();
    } else if (user) {
      // member: load only their own profile and payments
      const loadMember = async () => {
        try {
          setLoading(true);
          setError(null);
          const authHeaders = { Authorization: `Bearer ${token}` };
          const [meRes, programsRes, dietsRes, paymentsRes] = await Promise.all([
            apiFetch(`/api/me`, { headers: authHeaders }),
            apiFetch(`/api/programs`),
            apiFetch(`/api/diet-plans`),
            apiFetch(`/api/payments`, { headers: authHeaders }),
          ]);
          if (!meRes.ok || !programsRes.ok || !dietsRes.ok || !paymentsRes.ok) {
            throw new Error("Failed to load data from local API");
          }
          const meJson = await meRes.json();
          const programsJson = await programsRes.json();
          const dietsJson = await dietsRes.json();
          const paymentsJson = await paymentsRes.json();

          setMembers([
            {
              id: meJson.id,
              username: meJson.username,
              name: meJson.name,
              email: meJson.email ?? "",
              phone: meJson.phone ?? "",
              heightCm: meJson.height_cm ?? 0,
              weightKg: meJson.weight_kg ?? 0,
              trainer: meJson.trainer ?? "",
              membership: meJson.membership ?? "Custom",
              dietPlanId: meJson.diet_plan_id ?? null,
              paymentDay: meJson.payment_day ?? 1,
              status: meJson.status ?? "active",
              startDate: meJson.start_date ?? "",
              renewDate: meJson.renew_date ?? "",
              injuryHistory: meJson.injury_history ?? "",
              medicalNotes: meJson.medical_notes ?? "",
              balance: meJson.balance ?? 0,
              totalPaid: meJson.total_paid ?? 0,
              fees: meJson.fees ?? 0,
              role: meJson.role,
            },
          ]);

          setPrograms(
            programsJson.map((p: any): Program => ({
              id: p.id,
              name: p.name,
              type: p.type ?? "Custom",
              level: p.level ?? "Beginner",
              durationWeeks: p.duration_weeks ?? 0,
              sessionsPerWeek: p.sessions_per_week ?? 0,
            })),
          );

          setDietPlans(
            dietsJson.map((d: any): DietPlan => ({
              id: d.id,
              name: d.name,
              goal: d.goal ?? "Custom",
              calories: d.calories ?? 0,
              notes: d.notes ?? "",
              medical: d.medical ?? "",
              earlyMorningRemedy: d.early_morning_remedy ?? "",
              breakfast: d.breakfast ?? "",
              snack1: d.snack_1 ?? "",
              lunch: d.lunch ?? "",
              snack2: d.snack_2 ?? "",
              dinner: d.dinner ?? "",
              snack3: d.snack_3 ?? "",
            })),
          );

          setPayments(
            paymentsJson.map((p: any): Payment => ({
              id: p.id,
              memberId: p.member_id,
              date: p.date,
              amount: p.amount,
              method: p.method,
              type: p.type,
              note: p.note,
            })),
          );
        } catch (e: any) {
          setError(e.message || "Something went wrong while loading data");
        } finally {
          setLoading(false);
        }
      };
      loadMember();
    }
  }, [token, user]);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  );

  const refetchData = useCallback(async () => {
    if (user?.role !== "admin" || !token) return;
    try {
      const [membersRes, programsRes, dietsRes, paymentsRes] = await Promise.all([
        apiFetch(`/api/members`, { headers: authHeaders }),
        apiFetch(`/api/programs`),
        apiFetch(`/api/diet-plans`),
        apiFetch(`/api/payments`, { headers: authHeaders }),
      ]);
      if (!membersRes.ok || !programsRes.ok || !dietsRes.ok || !paymentsRes.ok) return;
      const [membersJson, programsJson, dietsJson, paymentsJson] = await Promise.all([
        membersRes.json(),
        programsRes.json(),
        dietsRes.json(),
        paymentsRes.json(),
      ]);
      setMembers(
        (Array.isArray(membersJson) ? membersJson.filter((m: any) => m.role !== "admin") : []).map((m: any): Member => ({
          id: m.id,
          username: m.username,
          name: m.name,
          email: m.email ?? "",
          phone: m.phone ?? "",
          heightCm: m.height_cm ?? 0,
          weightKg: m.weight_kg ?? 0,
          trainer: m.trainer ?? "",
          membership: m.membership ?? "Custom",
          dietPlanId: m.diet_plan_id ?? null,
          paymentDay: m.payment_day ?? 1,
          status: m.status ?? "active",
          startDate: m.start_date ?? "",
          renewDate: m.renew_date ?? "",
          injuryHistory: m.injury_history ?? "",
          medicalNotes: m.medical_notes ?? "",
          balance: m.balance ?? 0,
          totalPaid: m.total_paid ?? 0,
          fees: m.fees ?? 0,
          role: m.role,
        })),
      );
      setPrograms(
        programsJson.map((p: any): Program => ({
          id: p.id,
          name: p.name,
          type: p.type ?? "Custom",
          level: p.level ?? "Beginner",
          durationWeeks: p.duration_weeks ?? 0,
          sessionsPerWeek: p.sessions_per_week ?? 0,
        })),
      );
          setDietPlans(
            dietsJson.map((d: any): DietPlan => ({
              id: d.id,
              name: d.name,
              goal: d.goal ?? "Custom",
              calories: d.calories ?? 0,
              notes: d.notes ?? "",
              medical: d.medical ?? "",
              earlyMorningRemedy: d.early_morning_remedy ?? "",
              breakfast: d.breakfast ?? "",
              snack1: d.snack_1 ?? "",
              lunch: d.lunch ?? "",
              snack2: d.snack_2 ?? "",
              dinner: d.dinner ?? "",
              snack3: d.snack_3 ?? "",
            })),
          );
          setPayments(
        paymentsJson.map((p: any): Payment => ({
          id: p.id,
          memberId: p.member_id,
          date: p.date,
          amount: p.amount,
          method: p.method,
          type: p.type,
          note: p.note,
        })),
      );
    } catch (_) {}
  }, [token, user?.role, authHeaders]);

  const handleAddMember = useCallback(async () => {
    if (!token || addMemberForm.username.trim() === "" || addMemberForm.name.trim() === "" || addMemberForm.password.trim() === "") {
      setAddMemberError("Username, name and password are required");
      return;
    }
    setAddMemberSubmitting(true);
    setAddMemberError(null);
    try {
      const res = await apiFetch(`/api/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          username: addMemberForm.username.trim(),
          name: addMemberForm.name.trim(),
          password: addMemberForm.password,
          email: addMemberForm.email.trim() || undefined,
          phone: addMemberForm.phone.trim() || undefined,
          membership: addMemberForm.membership || memberPlanOptions[0] || "",
          diet_plan_id: addMemberForm.dietPlanId || undefined,
          payment_day: addMemberForm.paymentDay,
          fees: addMemberForm.fees,
          trainer: addMemberForm.trainer.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddMemberError((data as { error?: string }).error || "Failed to add member");
        return;
      }
      setAddMemberForm({ username: "", name: "", password: "", email: "", phone: "", membership: "", dietPlanId: null, paymentDay: 1, trainer: "", fees: 0 });
      setShowAddMember(false);
      await refetchData();
    } finally {
      setAddMemberSubmitting(false);
    }
  }, [token, authHeaders, addMemberForm, memberPlanOptions, refetchData]);

  const handleUpdateMemberPlan = useCallback(
    async (memberId: number, membership: string) => {
      if (!token) return;
      try {
        await apiFetch(`/api/members/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ membership }),
        });
        await refetchData();
      } catch (_) {}
    },
    [token, authHeaders, refetchData],
  );

  const handleSaveMemberFees = useCallback(
    async (
      memberId: number,
      balance: number,
      totalPaid: number,
      prevBalance: number,
      prevTotalPaid: number,
    ) => {
      if (!token) return;
      try {
        await apiFetch(`/api/members/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ balance, total_paid: totalPaid }),
        });

        const deltaPaid = (totalPaid ?? 0) - (prevTotalPaid ?? 0);
        if (deltaPaid !== 0) {
          await apiFetch(`/api/payments`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({
              member_id: memberId,
              amount: Math.abs(deltaPaid),
              method: "Cash",
              type: deltaPaid > 0 ? "credit" : "debit",
              note: "Fees updated from Members page",
            }),
          });
        }

        setEditingMemberId(null);
        await refetchData();
      } catch (_) {}
    },
    [token, authHeaders, refetchData],
  );

  const handleOpenEditMember = useCallback((m: Member) => {
    const planOptions = programs.map((p) => p.name);
    setEditingMember(m);
    setEditMemberForm({
      username: m.username ?? "",
      name: m.name,
      email: m.email,
      phone: m.phone,
      heightCm: m.heightCm,
      weightKg: m.weightKg,
      trainer: m.trainer,
      membership: planOptions.includes(m.membership) ? m.membership : (planOptions[0] ?? ""),
      dietPlanId: m.dietPlanId ?? null,
      paymentDay: m.paymentDay ?? 1,
      newPassword: "",
      fees: m.fees ?? 0,
    });
    setEditMemberError(null);
  }, [programs]);

  const handleSaveMemberEdit = useCallback(async () => {
    if (!token || !editingMember) return;
    if (!editMemberForm.username?.trim() || !editMemberForm.name?.trim()) {
      setEditMemberError("Username and name are required");
      return;
    }
    setEditMemberSubmitting(true);
    setEditMemberError(null);
    try {
      const body: Record<string, unknown> = {
        username: editMemberForm.username.trim(),
        name: editMemberForm.name.trim(),
        email: editMemberForm.email.trim() || "",
        phone: editMemberForm.phone.trim() || "",
        height_cm: editMemberForm.heightCm || 0,
        weight_kg: editMemberForm.weightKg || 0,
        trainer: editMemberForm.trainer.trim() || "",
        membership: editMemberForm.membership,
        diet_plan_id: editMemberForm.dietPlanId || null,
        payment_day: editMemberForm.paymentDay,
        fees: editMemberForm.fees,
      };
      if (editMemberForm.newPassword.trim()) {
        body.password = editMemberForm.newPassword.trim();
      }
      const res = await apiFetch(`/api/members/${editingMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditMemberError((data as { error?: string }).error || "Failed to update member");
        return;
      }
      setEditingMember(null);
      await refetchData();
    } finally {
      setEditMemberSubmitting(false);
    }
  }, [token, authHeaders, editingMember, editMemberForm, refetchData]);

  const handleMarkPaid = useCallback(
    async (member: Member) => {
      if (!token || member.balance <= 0) return;
      setMarkingPaidId(member.id);
      try {
        const res = await apiFetch(`/api/members/${member.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            balance: 0,
            total_paid: member.totalPaid + member.balance,
          }),
        });
        if (res.ok) await refetchData();
      } finally {
        setMarkingPaidId(null);
      }
    },
    [token, authHeaders, refetchData],
  );

  const handleRemoveMember = useCallback(async () => {
    if (!token || !removeMember) return;
    const memberId = removeMember.id;
    setRemoveMemberSubmitting(true);
    try {
      const res = await apiFetch(`/api/members/${memberId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (res.ok) {
        setRemoveMember(null);
        await refetchData();
      } else {
        const text = await res.text();
        let msg = "Failed to remove member";
        try {
          const data = JSON.parse(text) as { error?: string };
          if (data?.error) msg = data.error;
        } catch {
          if (text) msg = `${res.status}: ${text.slice(0, 80)}`;
          else msg = `${res.status}: ${res.statusText}`;
        }
        setRemoveMemberError(msg);
      }
    } finally {
      setRemoveMemberSubmitting(false);
    }
  }, [token, authHeaders, removeMember, refetchData]);

  const handleAddProgram = useCallback(async () => {
    if (!token || addProgramForm.name.trim() === "") {
      return;
    }
    setAddProgramSubmitting(true);
    try {
      const res = await apiFetch(`/api/programs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          name: addProgramForm.name.trim(),
          type: addProgramForm.type,
          level: addProgramForm.level,
          duration_weeks: addProgramForm.durationWeeks,
          sessions_per_week: addProgramForm.sessionsPerWeek,
        }),
      });
      if (!res.ok) return;
      setAddProgramForm({ name: "", type: "Custom", level: "Beginner", durationWeeks: 12, sessionsPerWeek: 4 });
      setShowAddProgram(false);
      await refetchData();
    } finally {
      setAddProgramSubmitting(false);
    }
  }, [token, authHeaders, addProgramForm, refetchData]);

  const handleUpdateProgram = useCallback(
    async (program: Program) => {
      if (!token) return;
      try {
        await apiFetch(`/api/programs/${program.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            name: program.name,
            type: program.type,
            level: program.level,
            duration_weeks: program.durationWeeks,
            sessions_per_week: program.sessionsPerWeek,
          }),
        });
        setEditingProgramId(null);
        setEditProgramForm(null);
        await refetchData();
      } catch (_) {}
    },
    [token, authHeaders, refetchData],
  );

  const handleUpdateMemberDiet = useCallback(
    async (memberId: number, dietPlanId: number | null) => {
      if (!token) return;
      try {
        await apiFetch(`/api/members/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ diet_plan_id: dietPlanId }),
        });
        await refetchData();
      } catch (_) {}
    },
    [token, authHeaders, refetchData],
  );

  const handleAddDietPlan = useCallback(async () => {
    if (!token || addDietForm.name.trim() === "") return;
    setAddDietSubmitting(true);
    try {
      const res = await apiFetch(`/api/diet-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          name: addDietForm.name.trim(),
          goal: addDietForm.goal,
          calories: addDietForm.calories ?? 0,
          notes: addDietForm.notes.trim() || "",
          medical: addDietForm.medical.trim() || "",
          early_morning_remedy: addDietForm.earlyMorningRemedy.trim() || "",
          breakfast: addDietForm.breakfast.trim() || "",
          snack_1: addDietForm.snack1.trim() || "",
          lunch: addDietForm.lunch.trim() || "",
          snack_2: addDietForm.snack2.trim() || "",
          dinner: addDietForm.dinner.trim() || "",
          snack_3: addDietForm.snack3.trim() || "",
        }),
      });
      if (!res.ok) return;
      setAddDietForm({
        name: "", goal: "Custom", calories: 2000, notes: "", medical: "",
        earlyMorningRemedy: "", breakfast: "", snack1: "", lunch: "", snack2: "", dinner: "", snack3: "",
      });
      setShowAddDietPlan(false);
      await refetchData();
    } finally {
      setAddDietSubmitting(false);
    }
  }, [token, authHeaders, addDietForm, refetchData]);

  const handleUpdateDietPlan = useCallback(
    async (diet: DietPlan) => {
      if (!token) return;
      try {
        await apiFetch(`/api/diet-plans/${diet.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            name: diet.name,
            goal: diet.goal,
            calories: diet.calories,
            notes: diet.notes,
            medical: diet.medical ?? "",
            early_morning_remedy: diet.earlyMorningRemedy ?? "",
            breakfast: diet.breakfast ?? "",
            snack_1: diet.snack1 ?? "",
            lunch: diet.lunch ?? "",
            snack_2: diet.snack2 ?? "",
            dinner: diet.dinner ?? "",
            snack_3: diet.snack3 ?? "",
          }),
        });
        setEditingDietId(null);
        setEditDietForm(null);
        await refetchData();
      } catch (_) {}
    },
    [token, authHeaders, refetchData],
  );

  const handleDeleteDietPlan = useCallback(
    async (id: number) => {
      if (!token) return;
      try {
        await apiFetch(`/api/diet-plans/${id}`, {
          method: "DELETE",
          headers: authHeaders,
        });
        setEditingDietId(null);
        setEditDietForm(null);
        await refetchData();
      } catch (_) {}
    },
    [token, authHeaders, refetchData],
  );

  const handleSaveMedical = useCallback(
    async (memberId: number) => {
      if (!token || !medicalEditForm) return;
      try {
        await apiFetch(`/api/members/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            injury_history: medicalEditForm.injuryHistory.trim(),
            medical_notes: medicalEditForm.medicalNotes.trim(),
          }),
        });
        setEditingMedicalMemberId(null);
        setMedicalEditForm(null);
        await refetchData();
      } catch (_) {}
    },
    [token, authHeaders, medicalEditForm, refetchData],
  );

  const handleSaveContact = useCallback(
    async (memberId: number) => {
      if (!token) return;
      try {
        await apiFetch(`/api/members/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            email: contactEdit.email.trim(),
            phone: contactEdit.phone.trim(),
            trainer: contactEdit.trainer.trim(),
          }),
        });
        setEditingContactId(null);
        await refetchData();
      } catch (_) {}
    },
    [token, authHeaders, contactEdit, refetchData],
  );

  const filteredMembers = useMemo(
    () =>
      members.filter((m) =>
        `${m.name} ${m.email} ${m.phone}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [members, search],
  );

  const metrics = useMemo(() => {
    const totalMembers = members.length;
    const activeMemberships = members.filter((m) => m.status === "active").length;
    const newRegistrations = members.filter((m) => m.startDate >= "2026-03-01").length;

    return { totalMembers, activeMemberships, newRegistrations };
  }, [members]);

  const latestPayments = useMemo(
    () =>
      [...payments]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 5),
    [payments],
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Dumbbell className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Redirecting to login…</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-sidebar border-b md:border-b-0 md:border-r border-sidebar-border flex flex-col flex-shrink-0">
        <div className="p-4 md:p-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-extrabold text-sidebar-foreground leading-tight text-sm">
              MG FITNESS
            </h2>
            <p className="text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-widest">
              Gym Management
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible scrollbar-none">
          {user?.role === "admin" && (
            <>
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex items-center gap-2 md:gap-3 rounded-lg px-3 md:px-3.5 py-2 md:py-2.5 text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === "dashboard" ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => setActiveTab("members")}
                className={`flex items-center gap-2 md:gap-3 rounded-lg px-3 md:px-3.5 py-2 md:py-2.5 text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === "members" ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Members</span>
              </button>
              <button
                onClick={() => setActiveTab("contacts")}
                className={`flex items-center gap-2 md:gap-3 rounded-lg px-3 md:px-3.5 py-2 md:py-2.5 text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === "contacts" ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <Phone className="h-4 w-4" />
                <span>Contact Info</span>
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab("programs")}
            className={`flex items-center gap-2 md:gap-3 rounded-lg px-3 md:px-3.5 py-2 md:py-2.5 text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === "programs" ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Programs</span>
          </button>
          <button
            onClick={() => setActiveTab("diet")}
            className={`flex items-center gap-2 md:gap-3 rounded-lg px-3 md:px-3.5 py-2 md:py-2.5 text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === "diet" ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <HeartPulse className="h-4 w-4" />
            <span>Diet</span>
          </button>
          <button
            onClick={() => setActiveTab("medical")}
            className={`flex items-center gap-2 md:gap-3 rounded-lg px-3 md:px-3.5 py-2 md:py-2.5 text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === "medical" ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <Stethoscope className="h-4 w-4" />
            <span>Medical & Injury</span>
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`flex items-center gap-2 md:gap-3 rounded-lg px-3 md:px-3.5 py-2 md:py-2.5 text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === "payments" ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Payments</span>
          </button>
        </nav>

        <div className="p-3 mt-auto hidden md:flex flex-col gap-2 border-t border-sidebar-border">
          <div className="rounded-lg overflow-hidden h-16 mb-2 border border-sidebar-border">
            <img
              src={gymImages.sidebarAccent}
              alt=""
              className="w-full h-full object-cover opacity-80"
            />
          </div>
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <section className="flex-1 p-5 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-h-[4rem]">
              <motion.p
                key={`${activeTab}-badge`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-xs font-semibold uppercase tracking-widest text-accent mb-1"
              >
                MG Fitness · {pageHeader.badge}
              </motion.p>
              <motion.h1
                key={`${activeTab}-title`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.05 }}
                className="text-2xl font-extrabold text-foreground"
              >
                {pageHeader.title}
              </motion.h1>
              <motion.p
                key={`${activeTab}-desc`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.1 }}
                className="text-sm text-muted-foreground mt-1"
              >
                {pageHeader.description}
              </motion.p>
            </div>
            <div className="flex items-center gap-2">
              {user?.role === "admin" && activeTab === "members" && (
                <Input
                  placeholder="Search members…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-48 md:w-64"
                />
              )}
              {user?.role === "admin" && (activeTab === "dashboard" || activeTab === "members") && (
                <Button
                  className="gap-1.5"
                  onClick={() => {
                    setActiveTab("members");
                    setShowAddMember(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add Member
                </Button>
              )}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <span className="hidden sm:inline truncate max-w-[140px]">{user.name}</span>
                      <Menu className="h-4 w-4 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[10rem]">
                    <DropdownMenuItem onClick={() => logout()} className="cursor-pointer gap-2">
                      <LogOut className="h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </header>

          {loading && (
            <div className="text-sm text-muted-foreground">Loading data from local database…</div>
          )}
          {error && (
            <div className="text-sm text-destructive">
              Failed to load from local database: {error}
            </div>
          )}

          <AnimatePresence mode="wait">
          {activeTab === "dashboard" && user?.role === "admin" && (
            <motion.div
              key="dashboard"
              {...pageLoad}
              className="w-full space-y-6"
            >
            <div
              className="relative h-48 md:h-64 rounded-xl overflow-hidden bg-muted"
              style={{ backgroundImage: `url(${gymImages.dashboardBanner})`, backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-widest text-yellow-300">MG Fitness</p>
                <h2 className="text-lg md:text-xl font-bold mt-0.5">Overview at a glance</h2>
              </div>
            </div>
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid gap-4 md:grid-cols-4"
            >
              <motion.div variants={item}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.totalMembers}</div>
                    <p className="text-xs text-muted-foreground">All registered members</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={item}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Memberships</CardTitle>
                    <Activity className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.activeMemberships}</div>
                    <p className="text-xs text-muted-foreground">Currently training members</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={item}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">New Registrations</CardTitle>
                    <UserRoundSearch className="h-4 w-4 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.newRegistrations}</div>
                    <p className="text-xs text-muted-foreground">Joined this month</p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
            </motion.div>
          )}

          {activeTab === "members" && user?.role === "admin" && (
            <motion.div key="members" {...pageLoad} className="space-y-4">
              <div className="relative h-40 md:h-52 rounded-xl overflow-hidden bg-muted" style={{ backgroundImage: `url(${gymImages.membersBanner})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white"><p className="text-xs font-semibold uppercase tracking-widest text-yellow-300">Team</p><h2 className="text-base font-bold">Members</h2></div>
              </div>
              {!showAddMember && (
                <Button onClick={() => setShowAddMember(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add Member
                </Button>
              )}
              {showAddMember && (
                <Card>
                  <CardHeader>
                    <CardTitle>Add Member</CardTitle>
                    <CardDescription>Set username, name, password and plan. Member can change password later.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {addMemberError && <p className="text-sm text-destructive">{addMemberError}</p>}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        placeholder="Username (login)"
                        value={addMemberForm.username}
                        onChange={(e) => setAddMemberForm((f) => ({ ...f, username: e.target.value }))}
                      />
                      <Input
                        placeholder="Full name"
                        value={addMemberForm.name}
                        onChange={(e) => setAddMemberForm((f) => ({ ...f, name: e.target.value }))}
                      />
                      <Input
                        type="password"
                        placeholder="Password"
                        value={addMemberForm.password}
                        onChange={(e) => setAddMemberForm((f) => ({ ...f, password: e.target.value }))}
                      />
                      <Select
                        value={addMemberForm.membership || (memberPlanOptions[0] ?? "")}
                        onValueChange={(v) => setAddMemberForm((f) => ({ ...f, membership: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                        <SelectContent>
                          {memberPlanOptions.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">Add programs in Programs tab</div>
                          ) : (
                            memberPlanOptions.map((name) => (
                              <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Select
                        value={addMemberForm.dietPlanId != null && dietPlans.some((d) => d.id === addMemberForm.dietPlanId) ? String(addMemberForm.dietPlanId) : "none"}
                        onValueChange={(v) => setAddMemberForm((f) => ({ ...f, dietPlanId: v === "none" ? null : Number(v) }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Diet plan (optional)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {dietPlans.map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={String(addMemberForm.paymentDay ?? 1)}
                        onValueChange={(v) => setAddMemberForm((f) => ({ ...f, paymentDay: Number(v) || 1 }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Payment day" /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                            <SelectItem key={d} value={String(d)}>{ordinal(d)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={0}
                        step={500}
                        placeholder="Fees (Rs.)"
                        value={addMemberForm.fees || ""}
                        onChange={(e) => setAddMemberForm((f) => ({ ...f, fees: Number(e.target.value) || 0 }))}
                      />
                      <Input
                        placeholder="Email"
                        value={addMemberForm.email}
                        onChange={(e) => setAddMemberForm((f) => ({ ...f, email: e.target.value }))}
                      />
                      <Input
                        placeholder="Phone"
                        value={addMemberForm.phone}
                        onChange={(e) => setAddMemberForm((f) => ({ ...f, phone: e.target.value }))}
                      />
                      <Input
                        placeholder="Trainer"
                        value={addMemberForm.trainer}
                        onChange={(e) => setAddMemberForm((f) => ({ ...f, trainer: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddMember} disabled={addMemberSubmitting}>
                        {addMemberSubmitting ? "Adding…" : "Add Member"}
                      </Button>
                      <Button variant="outline" onClick={() => { setShowAddMember(false); setAddMemberError(null); }}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>All Members</CardTitle>
                  <CardDescription>View and manage members. Plan, diet, payment day and fees are managed here.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table className="w-full table-auto">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-0">Name</TableHead>
                        <TableHead className="min-w-0">Trainer</TableHead>
                        <TableHead className="w-[120px] min-w-[120px]">Plan</TableHead>
                        {user?.role === "admin" && <TableHead className="hidden xl:table-cell w-[120px] min-w-[120px]">Diet</TableHead>}
                        {user?.role === "admin" && <TableHead className="hidden xl:table-cell w-[130px] min-w-[130px]">Payment date</TableHead>}
                        {user?.role === "admin" && <TableHead className="text-right w-[100px] min-w-[100px]">Fees</TableHead>}
                        <TableHead>Status</TableHead>
                        {user?.role === "admin" && (
                          <>
                            <TableHead className="text-right hidden lg:table-cell">Balance</TableHead>
                            <TableHead className="text-right hidden lg:table-cell">Total Paid</TableHead>
                            <TableHead className="w-[180px]">Actions</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium align-top">
                            <div className="whitespace-normal break-words">{m.name}</div>
                            {m.role === "admin" && <Badge className="ml-1 text-[10px]">Admin</Badge>}
                          </TableCell>
                          <TableCell className="whitespace-normal break-words">{m.trainer || "—"}</TableCell>
                          <TableCell className="w-[120px] min-w-[120px] align-top">
                            {user?.role === "admin" && m.role !== "admin" && memberPlanOptions.length > 0 ? (
                              <Select
                                value={memberPlanOptions.includes(m.membership) ? m.membership : memberPlanOptions[0]}
                                onValueChange={(v) => handleUpdateMemberPlan(m.id, v)}
                              >
                                <SelectTrigger className="h-8 w-full max-w-[120px]"><SelectValue placeholder="Plan" /></SelectTrigger>
                                <SelectContent>
                                  {memberPlanOptions.map((name) => (
                                    <SelectItem key={name} value={name}>{name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              m.membership || "—"
                            )}
                          </TableCell>
                          {user?.role === "admin" && (
                            <TableCell className="hidden xl:table-cell w-[120px] min-w-[120px] align-top">
                              {m.role !== "admin" ? (
                                <Select
                                  value={m.dietPlanId != null && dietPlans.some((d) => d.id === m.dietPlanId) ? String(m.dietPlanId) : "none"}
                                  onValueChange={(v) => handleUpdateMemberDiet(m.id, v === "none" ? null : Number(v))}
                                >
                                  <SelectTrigger className="h-8 w-full max-w-[120px]"><SelectValue placeholder="Diet" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {dietPlans.map((d) => (
                                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          )}
                          {user?.role === "admin" && (
                            <TableCell className="hidden xl:table-cell w-[130px] min-w-[130px] align-top">
                              {m.role !== "admin" ? (
                                <Select
                                  value={String(m.paymentDay ?? 1)}
                                  onValueChange={(v) =>
                                    apiFetch(`/api/members/${m.id}`, {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json", ...authHeaders },
                                      body: JSON.stringify({ payment_day: Number(v) || 1 }),
                                    }).then(() => refetchData()).catch(() => {})
                                  }
                                >
                                  <SelectTrigger className="h-8 w-auto min-w-[110px]"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                                      <SelectItem key={d} value={String(d)}>{ordinal(d)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          )}
                          {user?.role === "admin" && (
                            <TableCell className="text-right text-xs">
                              Rs. {(m.fees ?? 0).toLocaleString()}
                            </TableCell>
                          )}
                          <TableCell>
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${statusStyles[m.status]}`}>
                              {m.status}
                            </span>
                          </TableCell>
                          {user?.role === "admin" && (
                            <>
                              <TableCell className="text-right hidden lg:table-cell">
                                {editingMemberId === m.id ? (
                                  <Input
                                    type="number"
                                    className="h-8 w-20 text-right"
                                    value={editFees.balance}
                                    onChange={(e) => setEditFees((f) => ({ ...f, balance: Number(e.target.value) || 0 }))}
                                  />
                                ) : (
                                  <span className="text-xs">Rs. {m.balance.toLocaleString()}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right hidden lg:table-cell">
                                {editingMemberId === m.id ? (
                                  <Input
                                    type="number"
                                    className="h-8 w-20 text-right"
                                    value={editFees.totalPaid}
                                    onChange={(e) => setEditFees((f) => ({ ...f, totalPaid: Number(e.target.value) || 0 }))}
                                  />
                                ) : (
                                  <span className="text-xs">Rs. {m.totalPaid.toLocaleString()}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {m.role === "admin" ? (
                                  "—"
                                ) : editingMemberId === m.id ? (
                                  <div className="flex gap-1 flex-wrap">
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() =>
                                        handleSaveMemberFees(
                                          m.id,
                                          editFees.balance,
                                          editFees.totalPaid,
                                          m.balance,
                                          m.totalPaid,
                                        )
                                      }
                                    >
                                      Save
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingMemberId(null)}>Cancel</Button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1 flex-wrap">
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleOpenEditMember(m)}>
                                      Edit
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditingMemberId(m.id); setEditFees({ balance: m.balance, totalPaid: m.totalPaid }); }}>
                                      Mark fees
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { setRemoveMember({ id: m.id, name: m.name }); setRemoveMemberError(null); }}>
                                      <Trash2 className="h-3.5 w-3.5 mr-0.5 inline" />
                                      Remove
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Member</DialogTitle>
                    <DialogDescription>Change username, password, email, and other details. Leave password blank to keep current.</DialogDescription>
                  </DialogHeader>
                  {editingMember && (
                    <div className="space-y-4 pt-2">
                      {editMemberError && <p className="text-sm text-destructive">{editMemberError}</p>}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium">Username</label>
                          <Input
                            value={editMemberForm.username}
                            onChange={(e) => setEditMemberForm((f) => ({ ...f, username: e.target.value }))}
                            placeholder="Login username"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium">Full name</label>
                          <Input
                            value={editMemberForm.name}
                            onChange={(e) => setEditMemberForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="Full name"
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-xs font-medium">Email</label>
                          <Input
                            type="email"
                            value={editMemberForm.email}
                            onChange={(e) => setEditMemberForm((f) => ({ ...f, email: e.target.value }))}
                            placeholder="Email"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium">Phone</label>
                          <Input
                            value={editMemberForm.phone}
                            onChange={(e) => setEditMemberForm((f) => ({ ...f, phone: e.target.value }))}
                            placeholder="Phone"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium">New password (optional)</label>
                          <Input
                            type="password"
                            value={editMemberForm.newPassword}
                            onChange={(e) => setEditMemberForm((f) => ({ ...f, newPassword: e.target.value }))}
                            placeholder="Leave blank to keep current"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium">Height (cm)</label>
                          <Input
                            type="number"
                            value={editMemberForm.heightCm || ""}
                            onChange={(e) => setEditMemberForm((f) => ({ ...f, heightCm: Number(e.target.value) || 0 }))}
                            placeholder="Height"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium">Weight (kg)</label>
                          <Input
                            type="number"
                            value={editMemberForm.weightKg || ""}
                            onChange={(e) => setEditMemberForm((f) => ({ ...f, weightKg: Number(e.target.value) || 0 }))}
                            placeholder="Weight"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium">Trainer</label>
                          <Input
                            value={editMemberForm.trainer}
                            onChange={(e) => setEditMemberForm((f) => ({ ...f, trainer: e.target.value }))}
                            placeholder="Trainer name"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium">Plan</label>
                          <Select
                            value={memberPlanOptions.includes(editMemberForm.membership) ? editMemberForm.membership : (memberPlanOptions[0] ?? "")}
                            onValueChange={(v) => setEditMemberForm((f) => ({ ...f, membership: v }))}
                          >
                            <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                            <SelectContent>
                              {memberPlanOptions.map((name) => (
                                <SelectItem key={name} value={name}>{name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium">Diet plan</label>
                          <Select
                            value={editMemberForm.dietPlanId != null && dietPlans.some((d) => d.id === editMemberForm.dietPlanId) ? String(editMemberForm.dietPlanId) : "none"}
                            onValueChange={(v) => setEditMemberForm((f) => ({ ...f, dietPlanId: v === "none" ? null : Number(v) }))}
                          >
                            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {dietPlans.map((d) => (
                                <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium">Payment day</label>
                          <Select
                            value={String(editMemberForm.paymentDay ?? 1)}
                            onValueChange={(v) => setEditMemberForm((f) => ({ ...f, paymentDay: Number(v) || 1 }))}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                                <SelectItem key={d} value={String(d)}>{ordinal(d)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium">Fees (Rs.)</label>
                          <Input
                            type="number"
                            min={0}
                            step={500}
                            value={editMemberForm.fees !== undefined && editMemberForm.fees !== null ? editMemberForm.fees : ""}
                            onChange={(e) => setEditMemberForm((f) => ({ ...f, fees: Number(e.target.value) || 0 }))}
                            placeholder="e.g. 12000"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button onClick={handleSaveMemberEdit} disabled={editMemberSubmitting}>
                          {editMemberSubmitting ? "Saving…" : "Save changes"}
                        </Button>
                        <Button variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </motion.div>
          )}

          {activeTab === "contacts" && user?.role === "admin" && (
            <motion.div key="contacts" {...pageLoad} className="space-y-4">
              <div className="relative h-40 md:h-52 rounded-xl overflow-hidden bg-muted" style={{ backgroundImage: `url(${gymImages.sidebarAccent})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white"><p className="text-xs font-semibold uppercase tracking-widest text-yellow-300">Contacts</p><h2 className="text-base font-bold">Contact Information</h2></div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Members Contact Information</CardTitle>
                  <CardDescription>Edit email, phone and trainer for each member. Admin only.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Table className="w-full table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Trainer</TableHead>
                        <TableHead className="w-[180px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members
                        .filter((m) => m.role !== "admin")
                        .map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium whitespace-normal break-words">{m.name}</TableCell>
                            <TableCell className="whitespace-normal break-words">
                              {editingContactId === m.id ? (
                                <Input className="h-8" value={contactEdit.email} onChange={(e) => setContactEdit((c) => ({ ...c, email: e.target.value }))} />
                              ) : (
                                <span className="text-sm">{m.email || "—"}</span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-normal break-words">
                              {editingContactId === m.id ? (
                                <Input className="h-8" value={contactEdit.phone} onChange={(e) => setContactEdit((c) => ({ ...c, phone: e.target.value }))} />
                              ) : (
                                <span className="text-sm">{m.phone || "—"}</span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-normal break-words">
                              {editingContactId === m.id ? (
                                <Input className="h-8" value={contactEdit.trainer} onChange={(e) => setContactEdit((c) => ({ ...c, trainer: e.target.value }))} />
                              ) : (
                                <span className="text-sm">{m.trainer || "—"}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {editingContactId === m.id ? (
                                <div className="flex gap-1 flex-wrap">
                                  <Button size="sm" className="h-7 text-xs" onClick={() => handleSaveContact(m.id)}>Save</Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingContactId(null)}>Cancel</Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setEditingContactId(m.id);
                                    setContactEdit({ email: m.email ?? "", phone: m.phone ?? "", trainer: m.trainer ?? "" });
                                  }}
                                >
                                  Edit
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "programs" && (
            <motion.div key="programs" {...pageLoad} className="space-y-4">
              <div className="relative h-40 md:h-52 rounded-xl overflow-hidden bg-muted" style={{ backgroundImage: `url(${gymImages.programs})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white"><p className="text-xs font-semibold uppercase tracking-widest text-yellow-300">Training</p><h2 className="text-base font-bold">Programs</h2></div>
              </div>
              {user?.role === "admin" && (
                <>
                  {showAddProgram ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>Add Program</CardTitle>
                        <CardDescription>Create a new program (Weight Loss, Weight Gain, or Custom).</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input placeholder="Program name" value={addProgramForm.name} onChange={(e) => setAddProgramForm((f) => ({ ...f, name: e.target.value }))} />
                          <Select value={addProgramForm.type} onValueChange={(v) => setAddProgramForm((f) => ({ ...f, type: v as (typeof PLAN_OPTIONS)[number] }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PLAN_OPTIONS.map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={addProgramForm.level} onValueChange={(v) => setAddProgramForm((f) => ({ ...f, level: v as (typeof LEVEL_OPTIONS)[number] }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {LEVEL_OPTIONS.map((l) => (
                                <SelectItem key={l} value={l}>{l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input type="number" placeholder="Duration (weeks)" value={addProgramForm.durationWeeks || ""} onChange={(e) => setAddProgramForm((f) => ({ ...f, durationWeeks: Number(e.target.value) || 0 }))} />
                          <Input type="number" placeholder="Sessions per week" value={addProgramForm.sessionsPerWeek || ""} onChange={(e) => setAddProgramForm((f) => ({ ...f, sessionsPerWeek: Number(e.target.value) || 0 }))} />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleAddProgram} disabled={addProgramSubmitting}>{addProgramSubmitting ? "Adding…" : "Add Program"}</Button>
                          <Button variant="outline" onClick={() => setShowAddProgram(false)}>Cancel</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Button onClick={() => setShowAddProgram(true)} className="gap-1.5">
                      <Plus className="h-4 w-4" />
                      Add Program
                    </Button>
                  )}
                </>
              )}
              <div className="grid gap-4 md:grid-cols-3">
                {(user?.role === "admin" ? programs : programs.filter((p) => p.name === members[0]?.membership)).map((p) => (
                  <Card key={p.id} className="border-dashed">
                    {user?.role === "admin" && editingProgramId === p.id && editProgramForm ? (
                      <CardContent className="pt-6 space-y-3">
                        <Input value={editProgramForm.name} onChange={(e) => setEditProgramForm((f) => f ? { ...f, name: e.target.value } : null)} placeholder="Name" />
                        <Select value={editProgramForm.type} onValueChange={(v) => setEditProgramForm((f) => f ? { ...f, type: v as (typeof PLAN_OPTIONS)[number] } : null)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PLAN_OPTIONS.map((x) => (
                              <SelectItem key={x} value={x}>{x}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={editProgramForm.level} onValueChange={(v) => setEditProgramForm((f) => f ? { ...f, level: v as (typeof LEVEL_OPTIONS)[number] } : null)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {LEVEL_OPTIONS.map((x) => (
                              <SelectItem key={x} value={x}>{x}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input type="number" value={editProgramForm.durationWeeks} onChange={(e) => setEditProgramForm((f) => f ? { ...f, durationWeeks: Number(e.target.value) || 0 } : null)} />
                        <Input type="number" value={editProgramForm.sessionsPerWeek} onChange={(e) => setEditProgramForm((f) => f ? { ...f, sessionsPerWeek: Number(e.target.value) || 0 } : null)} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => editProgramForm && handleUpdateProgram(editProgramForm)}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => { setEditingProgramId(null); setEditProgramForm(null); }}>Cancel</Button>
                        </div>
                      </CardContent>
                    ) : (
                      <>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{p.name}</CardTitle>
                            <Badge>{p.type}</Badge>
                          </div>
                          <CardDescription>{p.level} · {p.sessionsPerWeek} sessions / week</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">Duration: <span className="font-medium">{p.durationWeeks}</span> weeks</p>
                          {user?.role === "admin" && (
                            <Button size="sm" variant="outline" className="mt-2" onClick={() => { setEditingProgramId(p.id); setEditProgramForm({ ...p }); }}>
                              Edit
                            </Button>
                          )}
                        </CardContent>
                      </>
                    )}
                  </Card>
                ))}
              </div>
              {user?.role !== "admin" && programs.filter((p) => p.name === members[0]?.membership).length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No program assigned yet. Contact admin.
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {activeTab === "diet" && (
            <motion.div key="diet" {...pageLoad} className="space-y-4">
              <div className="relative h-40 md:h-52 rounded-xl overflow-hidden bg-muted" style={{ backgroundImage: `url(${gymImages.diet})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white"><p className="text-xs font-semibold uppercase tracking-widest text-yellow-300">Nutrition</p><h2 className="text-base font-bold">Diet Plans</h2></div>
              </div>
              {user?.role === "admin" ? (
                <div className="space-y-4">
                  {showAddDietPlan ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>Add Diet Plan</CardTitle>
                        <CardDescription>Create a new diet plan (goal: Weight Loss, Weight Gain, or Custom).</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input placeholder="Diet plan name" value={addDietForm.name} onChange={(e) => setAddDietForm((f) => ({ ...f, name: e.target.value }))} />
                          <Select value={addDietForm.goal} onValueChange={(v) => setAddDietForm((f) => ({ ...f, goal: v as (typeof PLAN_OPTIONS)[number] }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PLAN_OPTIONS.map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input type="number" placeholder="Current calorie (Kcal)" value={addDietForm.calories || ""} onChange={(e) => setAddDietForm((f) => ({ ...f, calories: Number(e.target.value) || 0 }))} />
                          <Input placeholder="Medical (considerations)" value={addDietForm.medical} onChange={(e) => setAddDietForm((f) => ({ ...f, medical: e.target.value }))} />
                          <Input placeholder="Notes" value={addDietForm.notes} onChange={(e) => setAddDietForm((f) => ({ ...f, notes: e.target.value }))} className="sm:col-span-2" />
                        </div>
                        <div className="space-y-2 border-t pt-4">
                          <p className="text-sm font-medium">Diet chart – meal content</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Early morning remedy</label>
                              <Textarea placeholder="e.g. Warm water, lemon, etc." value={addDietForm.earlyMorningRemedy} onChange={(e) => setAddDietForm((f) => ({ ...f, earlyMorningRemedy: e.target.value }))} rows={2} className="resize-none" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Breakfast</label>
                              <Textarea placeholder="Food items and portions" value={addDietForm.breakfast} onChange={(e) => setAddDietForm((f) => ({ ...f, breakfast: e.target.value }))} rows={2} className="resize-none" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Snack 1</label>
                              <Textarea placeholder="Mid-morning snack" value={addDietForm.snack1} onChange={(e) => setAddDietForm((f) => ({ ...f, snack1: e.target.value }))} rows={2} className="resize-none" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Lunch</label>
                              <Textarea placeholder="Lunch items" value={addDietForm.lunch} onChange={(e) => setAddDietForm((f) => ({ ...f, lunch: e.target.value }))} rows={2} className="resize-none" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Snack 2</label>
                              <Textarea placeholder="Afternoon snack" value={addDietForm.snack2} onChange={(e) => setAddDietForm((f) => ({ ...f, snack2: e.target.value }))} rows={2} className="resize-none" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Dinner</label>
                              <Textarea placeholder="Dinner items" value={addDietForm.dinner} onChange={(e) => setAddDietForm((f) => ({ ...f, dinner: e.target.value }))} rows={2} className="resize-none" />
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <label className="text-xs text-muted-foreground">Snack 3</label>
                              <Textarea placeholder="Evening / post-dinner snack" value={addDietForm.snack3} onChange={(e) => setAddDietForm((f) => ({ ...f, snack3: e.target.value }))} rows={2} className="resize-none" />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleAddDietPlan} disabled={addDietSubmitting}>{addDietSubmitting ? "Adding…" : "Add Diet Plan"}</Button>
                          <Button variant="outline" onClick={() => setShowAddDietPlan(false)}>Cancel</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Button onClick={() => setShowAddDietPlan(true)} className="gap-1.5">
                      <Plus className="h-4 w-4" />
                      Add Diet Plan
                    </Button>
                  )}
                <Card>
                  <CardHeader>
                    <CardTitle>Diet Plans</CardTitle>
                    <CardDescription>
                      Assign diet plans to members. Edit or delete below.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dietPlans.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-start justify-between rounded-lg border border-border bg-muted/40 px-3 py-2"
                      >
                        {editingDietId === d.id && editDietForm ? (
                          <div className="flex-1 space-y-3 min-w-0">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <Input value={editDietForm.name} onChange={(e) => setEditDietForm((f) => f ? { ...f, name: e.target.value } : null)} placeholder="Name" className="h-8" />
                              <Select value={editDietForm.goal} onValueChange={(v) => setEditDietForm((f) => f ? { ...f, goal: v as (typeof PLAN_OPTIONS)[number] } : null)}>
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {PLAN_OPTIONS.map((p) => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input type="number" value={editDietForm.calories} onChange={(e) => setEditDietForm((f) => f ? { ...f, calories: Number(e.target.value) || 0 } : null)} placeholder="Kcal" className="h-8" />
                              <Input value={editDietForm.medical} onChange={(e) => setEditDietForm((f) => f ? { ...f, medical: e.target.value } : null)} placeholder="Medical" className="h-8" />
                              <Input value={editDietForm.notes} onChange={(e) => setEditDietForm((f) => f ? { ...f, notes: e.target.value } : null)} placeholder="Notes" className="h-8 sm:col-span-2" />
                            </div>
                            <div className="grid gap-1.5 grid-cols-1 sm:grid-cols-2 text-xs">
                              <div><span className="text-muted-foreground">Early morning:</span><Textarea value={editDietForm.earlyMorningRemedy ?? ""} onChange={(e) => setEditDietForm((f) => f ? { ...f, earlyMorningRemedy: e.target.value } : null)} rows={1} className="h-14 resize-none mt-0.5" /></div>
                              <div><span className="text-muted-foreground">Breakfast:</span><Textarea value={editDietForm.breakfast ?? ""} onChange={(e) => setEditDietForm((f) => f ? { ...f, breakfast: e.target.value } : null)} rows={1} className="h-14 resize-none mt-0.5" /></div>
                              <div><span className="text-muted-foreground">Snack 1:</span><Textarea value={editDietForm.snack1 ?? ""} onChange={(e) => setEditDietForm((f) => f ? { ...f, snack1: e.target.value } : null)} rows={1} className="h-14 resize-none mt-0.5" /></div>
                              <div><span className="text-muted-foreground">Lunch:</span><Textarea value={editDietForm.lunch ?? ""} onChange={(e) => setEditDietForm((f) => f ? { ...f, lunch: e.target.value } : null)} rows={1} className="h-14 resize-none mt-0.5" /></div>
                              <div><span className="text-muted-foreground">Snack 2:</span><Textarea value={editDietForm.snack2 ?? ""} onChange={(e) => setEditDietForm((f) => f ? { ...f, snack2: e.target.value } : null)} rows={1} className="h-14 resize-none mt-0.5" /></div>
                              <div><span className="text-muted-foreground">Dinner:</span><Textarea value={editDietForm.dinner ?? ""} onChange={(e) => setEditDietForm((f) => f ? { ...f, dinner: e.target.value } : null)} rows={1} className="h-14 resize-none mt-0.5" /></div>
                              <div className="sm:col-span-2"><span className="text-muted-foreground">Snack 3:</span><Textarea value={editDietForm.snack3 ?? ""} onChange={(e) => setEditDietForm((f) => f ? { ...f, snack3: e.target.value } : null)} rows={1} className="h-14 resize-none mt-0.5" /></div>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" onClick={() => editDietForm && handleUpdateDietPlan(editDietForm)}>Save</Button>
                              <Button size="sm" variant="outline" onClick={() => { setEditingDietId(null); setEditDietForm(null); }}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{d.name}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {d.goal}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                ~{d.calories} kcal · {d.notes}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => { setEditingDietId(d.id); setEditDietForm({ ...d }); }}>Edit</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteDietPlan(d.id)}>Delete</Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Your diet chart</CardTitle>
                    <CardDescription>
                      Diet plan assigned to your program.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      const myDiet = members[0]?.dietPlanId != null
                        ? dietPlans.find((d) => d.id === members[0].dietPlanId)
                        : null;
                      if (!myDiet) return <p className="text-sm text-muted-foreground">No diet plan assigned. Contact admin.</p>;
                      const rows: { label: string; value: string }[] = [
                        { label: "Current calorie", value: `${myDiet.calories} Kcal` },
                        { label: "Medical", value: myDiet.medical || "—" },
                        { label: "Early morning remedy", value: myDiet.earlyMorningRemedy || "—" },
                        { label: "Breakfast", value: myDiet.breakfast || "—" },
                        { label: "Snack 1", value: myDiet.snack1 || "—" },
                        { label: "Lunch", value: myDiet.lunch || "—" },
                        { label: "Snack 2", value: myDiet.snack2 || "—" },
                        { label: "Dinner", value: myDiet.dinner || "—" },
                        { label: "Snack 3", value: myDiet.snack3 || "—" },
                      ];
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{myDiet.name}</span>
                            <Badge variant="outline" className="text-[10px]">{myDiet.goal}</Badge>
                            {myDiet.notes ? <span className="text-xs text-muted-foreground">· {myDiet.notes}</span> : null}
                          </div>
                          <div className="rounded-lg border border-border overflow-hidden">
                            <Table>
                              <TableBody>
                                {rows.map(({ label, value }) => (
                                  <TableRow key={label}>
                                    <TableCell className="font-medium w-[180px] align-top bg-muted/40 text-muted-foreground">
                                      {label}
                                    </TableCell>
                                    <TableCell className="align-top whitespace-pre-wrap">{value}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {activeTab === "medical" && (
            <motion.div key="medical" {...pageLoad} className="space-y-4">
              <div className="relative h-40 md:h-52 rounded-xl overflow-hidden bg-muted" style={{ backgroundImage: `url(${gymImages.medical})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white"><p className="text-xs font-semibold uppercase tracking-widest text-yellow-300">Health</p><h2 className="text-base font-bold">Medical &amp; Injury History</h2></div>
              </div>
              {user?.role === "admin" ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Medical &amp; Injury History</CardTitle>
                    <CardDescription>
                      View and edit member injury history and medical notes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {members.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-lg border border-border bg-muted/40 px-3 py-2 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-accent" />
                            <span className="text-sm font-semibold">{m.name}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {m.membership}
                          </Badge>
                        </div>
                        {editingMedicalMemberId === m.id && medicalEditForm ? (
                          <div className="space-y-2 pt-1">
                            <Input
                              placeholder="Injury history"
                              value={medicalEditForm.injuryHistory}
                              onChange={(e) => setMedicalEditForm((f) => f ? { ...f, injuryHistory: e.target.value } : null)}
                              className="text-sm"
                            />
                            <Input
                              placeholder="Medical notes"
                              value={medicalEditForm.medicalNotes}
                              onChange={(e) => setMedicalEditForm((f) => f ? { ...f, medicalNotes: e.target.value } : null)}
                              className="text-sm"
                            />
                            <div className="flex gap-1">
                              <Button size="sm" onClick={() => handleSaveMedical(m.id)}>Save</Button>
                              <Button size="sm" variant="outline" onClick={() => { setEditingMedicalMemberId(null); setMedicalEditForm(null); }}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-semibold">Injury:</span> {m.injuryHistory || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-semibold">Notes:</span> {m.medicalNotes || "—"}
                            </p>
                            <Button size="sm" variant="outline" className="mt-1" onClick={() => { setEditingMedicalMemberId(m.id); setMedicalEditForm({ injuryHistory: m.injuryHistory || "", medicalNotes: m.medicalNotes || "" }); }}>Edit</Button>
                          </>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Your medical &amp; injury notes</CardTitle>
                    <CardDescription>
                      Your recorded injury history and medical notes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {members[0] ? (
                      <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 space-y-1">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold">Injury history:</span> {members[0].injuryHistory || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold">Medical notes:</span> {members[0].medicalNotes || "—"}
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {activeTab === "payments" && (
            <motion.div key="payments" {...pageLoad} className="space-y-4">
              <div className="relative h-40 md:h-52 rounded-xl overflow-hidden bg-muted" style={{ backgroundImage: `url(${gymImages.payments})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white"><p className="text-xs font-semibold uppercase tracking-widest text-yellow-300">Billing</p><h2 className="text-base font-bold">Payments Pending</h2></div>
              </div>
              {user?.role === "admin" ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Payments Pending</CardTitle>
                    <CardDescription>
                      Members with an outstanding balance. Payment date is the day of the month (1–30) when their fee is due.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Payment date</TableHead>
                          <TableHead className="text-right">Outstanding balance</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members
                          .filter((m) => m.balance > 0)
                          .sort((a, b) => (a.paymentDay ?? 1) - (b.paymentDay ?? 1))
                          .map((m) => (
                            <TableRow key={m.id}>
                              <TableCell className="font-medium">{m.name}</TableCell>
                              <TableCell>{ordinal(m.paymentDay ?? 1)} of each month</TableCell>
                              <TableCell className="text-right">Rs. {m.balance.toLocaleString()}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs"
                                  disabled={markingPaidId === m.id}
                                  onClick={() => handleMarkPaid(m)}
                                >
                                  {markingPaidId === m.id ? "Marking…" : "Mark paid"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                    {members.filter((m) => m.balance > 0).length === 0 && (
                      <p className="py-6 text-center text-sm text-muted-foreground">No pending payments. All members are up to date.</p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Payments Pending</CardTitle>
                    <CardDescription>
                      Your outstanding balance and payment date.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-muted-foreground">Payment date</span>
                      <span className="text-lg font-semibold">
                        {members[0] ? ordinal(members[0].paymentDay ?? 1) : "—"} of each month
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-muted-foreground">Outstanding balance</span>
                      <span className="text-2xl font-bold">Rs. {members[0]?.balance.toLocaleString() ?? 0}</span>
                    </div>
                    {(!members[0] || members[0].balance <= 0) && (
                      <p className="text-sm text-muted-foreground">You have no pending payments.</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
          </AnimatePresence>

          <AlertDialog open={!!removeMember} onOpenChange={(open) => { if (!open) { setRemoveMember(null); setRemoveMemberError(null); } }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove member</AlertDialogTitle>
                <AlertDialogDescription>
                  Remove {removeMember?.name}? This will delete their account and payment history. They will no longer be able to log in.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {removeMemberError && <p className="text-sm text-destructive">{removeMemberError}</p>}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={removeMemberSubmitting}>Cancel</AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={removeMemberSubmitting}
                  onClick={() => handleRemoveMember()}
                >
                  {removeMemberSubmitting ? "Removing…" : "Remove"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </main>
  );
}

