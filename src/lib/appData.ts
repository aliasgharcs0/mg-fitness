export interface Student {
  id: string;
  name: string;
  roll_number: string;
  hostel_id: string;
  role: "student" | "admin";
}

export interface Hostel {
  id: string;
  name: string;
  type: "boys" | "girls" | "mixed";
}

export interface AppSettings {
  billVisibleToStudents: boolean;
}

export interface BillingEntry {
  name: string;
  roll: string;
  meals: number;
  bill: number;
  paid: number;
  status: "paid" | "partial" | "unpaid";
}

export interface MonthlyBilling {
  month: string;
  data: BillingEntry[];
}

const DEFAULT_SETTINGS: AppSettings = {
  billVisibleToStudents: false,
};

export function getSettings(): AppSettings {
  const stored = localStorage.getItem("appSettings");
  if (stored) return JSON.parse(stored);
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem("appSettings", JSON.stringify(settings));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function getCurrentMonthLabel(): string {
  const now = new Date();
  return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
