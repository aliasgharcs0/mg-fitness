import { Dumbbell, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type TabId = "dashboard" | "members" | "programs" | "diet" | "medical" | "payments";

type NavbarProps = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  userName: string;
  isAdmin: boolean;
  onLogout: () => void | Promise<void>;
};

const NAV_ITEMS: { id: TabId; label: string; adminOnly?: boolean }[] = [
  { id: "dashboard", label: "Dashboard", adminOnly: true },
  { id: "members", label: "Members", adminOnly: true },
  { id: "programs", label: "Programs" },
  { id: "diet", label: "Diet" },
  { id: "medical", label: "Medical" },
  { id: "payments", label: "Payments" },
];

export default function Navbar({ activeTab, onTabChange, userName, isAdmin, onLogout }: NavbarProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[#FF7A1A]/40 bg-black/35 backdrop-blur-xl dark:bg-black/45">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full orange-yellow-gradient text-white shadow-neon-orange">
            <Dumbbell className="h-4 w-4" />
          </div>
          <span className="font-headings text-lg font-extrabold tracking-wide text-transparent bg-clip-text orange-yellow-gradient">
            MG Fitness
          </span>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={cn(
                "relative rounded-xl px-3 py-2 text-sm font-semibold text-foreground/85 transition-colors hover:text-foreground",
                activeTab === item.id && "text-white neon-glow",
              )}
            >
              {item.label}
              <span
                className={cn(
                  "absolute bottom-0 left-2 h-[2px] bg-gradient-to-r from-[#FF4D00] to-[#FFC300] transition-all duration-300",
                  activeTab === item.id ? "w-[calc(100%-1rem)] opacity-100" : "w-0 opacity-0",
                )}
              />
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 rounded-full">
                <span className="hidden max-w-[140px] truncate sm:inline">{userName}</span>
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[11rem]">
              {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
                <DropdownMenuItem key={item.id} onClick={() => onTabChange(item.id)} className="cursor-pointer md:hidden">
                  {item.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={onLogout} className="cursor-pointer gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
