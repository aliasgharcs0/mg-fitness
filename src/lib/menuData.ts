import { supabase } from "@/integrations/supabase/client";

export const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];
export type MealType = "breakfast" | "lunch" | "dinner";

export interface MenuItem {
  id: string;
  items: string[];
  price: number;
}

export interface DayMenu {
  day: DayOfWeek;
  breakfast: MenuItem;
  lunch: MenuItem;
  dinner: MenuItem;
}

export interface MealPrices {
  breakfast: number;
  lunch: number;
  dinner: number;
}

export interface WeeklyMenu {
  weekStart: string;
  defaultPrices: MealPrices;
  days: DayMenu[];
}

export const DEFAULT_WEEKLY_MENU: WeeklyMenu = {
  weekStart: "2026-03-09",
  defaultPrices: { breakfast: 100, lunch: 200, dinner: 250 },
  days: [
    { day: "Monday", breakfast: { id: "m1b", items: ["Paratha", "Omelette", "Chai"], price: 100 }, lunch: { id: "m1l", items: ["Chicken Biryani", "Raita", "Salad"], price: 200 }, dinner: { id: "m1d", items: ["Daal Chawal", "Naan", "Kheer"], price: 250 } },
    { day: "Tuesday", breakfast: { id: "m2b", items: ["Halwa Puri", "Chana", "Chai"], price: 100 }, lunch: { id: "m2l", items: ["Beef Karahi", "Rice", "Salad"], price: 200 }, dinner: { id: "m2d", items: ["Aloo Gosht", "Roti", "Gulab Jamun"], price: 250 } },
    { day: "Wednesday", breakfast: { id: "m3b", items: ["French Toast", "Juice", "Fruit"], price: 100 }, lunch: { id: "m3l", items: ["Chicken Qorma", "Naan", "Raita"], price: 200 }, dinner: { id: "m3d", items: ["Daal Makhni", "Rice", "Custard"], price: 250 } },
    { day: "Thursday", breakfast: { id: "m4b", items: ["Nihari", "Naan", "Chai"], price: 150 }, lunch: { id: "m4l", items: ["Mutton Pulao", "Salad", "Yogurt"], price: 250 }, dinner: { id: "m4d", items: ["Chicken Handi", "Roti", "Firni"], price: 250 } },
    { day: "Friday", breakfast: { id: "m5b", items: ["Paratha", "Lassi", "Anda Bhurji"], price: 100 }, lunch: { id: "m5l", items: ["Special Biryani", "Raita", "Gulab Jamun"], price: 300 }, dinner: { id: "m5d", items: ["Keema Matar", "Naan", "Ice Cream"], price: 300 } },
    { day: "Saturday", breakfast: { id: "m6b", items: ["Chana Puri", "Chai"], price: 100 }, lunch: { id: "m6l", items: ["Chicken Karahi", "Rice", "Salad"], price: 200 }, dinner: { id: "m6d", items: ["Mixed Daal", "Roti", "Sewaiyan"], price: 250 } },
    { day: "Sunday", breakfast: { id: "m7b", items: ["Pancakes", "Juice", "Eggs"], price: 100 }, lunch: { id: "m7l", items: ["BBQ Platter", "Naan", "Chutney"], price: 350 }, dinner: { id: "m7d", items: ["Chicken Tikka", "Rice", "Kheer"], price: 300 } },
  ],
};

// Legacy localStorage helpers (kept as fallback)
export function getMenuFromStorage(): WeeklyMenu {
  const stored = localStorage.getItem("weeklyMenu");
  if (stored) return JSON.parse(stored);
  return DEFAULT_WEEKLY_MENU;
}

export function saveMenuToStorage(menu: WeeklyMenu) {
  localStorage.setItem("weeklyMenu", JSON.stringify(menu));
}

// Supabase helpers
export async function fetchMenuFromSupabase(): Promise<WeeklyMenu> {
  const { data, error } = await supabase
    .from("weekly_menu")
    .select("menu_data")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data || !data.menu_data) {
    return DEFAULT_WEEKLY_MENU;
  }
  return data.menu_data as unknown as WeeklyMenu;
}

export async function saveMenuToSupabase(menu: WeeklyMenu): Promise<boolean> {
  const { error } = await supabase
    .from("weekly_menu")
    .upsert({ id: 1, menu_data: menu as any, updated_at: new Date().toISOString() });

  if (error) {
    console.error("Failed to save menu:", error);
  }
  return !error;
}
