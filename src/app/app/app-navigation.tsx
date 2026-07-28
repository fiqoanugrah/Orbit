import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Layers,
  ListChecks,
  ReceiptText,
  Settings,
  ShieldCheck,
  UserPlus,
  UserCircle,
  Users,
} from "lucide-react";

import { OrbitMark } from "@/components/orbit-mark";
import { cn } from "@/lib/utils";

const navigation = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/app/dashboard",
    enabled: true,
  },
  { label: "Students", icon: Users, href: "/app/students", enabled: true },
  { label: "Parents", icon: Users, href: "/app/parents", enabled: true },
  {
    label: "Teachers",
    icon: GraduationCap,
    href: "/app/teachers",
    enabled: true,
  },
  { label: "Programs", icon: BookOpen, href: "/app/programs", enabled: true },
  { label: "Paket", icon: Layers, href: "/app/packages", enabled: true },
  { label: "Classes", icon: CalendarDays, href: "/app/classes", enabled: true },
  {
    label: "Attendance",
    icon: ClipboardCheck,
    href: "/app/attendance",
    enabled: true,
  },
  {
    label: "Enrollments",
    icon: UserPlus,
    href: "/app/enrollments",
    enabled: true,
  },
  { label: "Invoices", icon: ReceiptText, href: "/app/invoices", enabled: true },
  { label: "Members", icon: Users, href: "/app/members", enabled: true },
  { label: "Profile", icon: UserCircle, href: "/app/profile", enabled: true },
  { label: "Roles", icon: ShieldCheck, href: "/app/roles", enabled: true },
  { label: "Settings", icon: Settings, href: "/app/profile", enabled: true },
  { label: "Tutorial", icon: ListChecks, href: "/app/tutorial", enabled: true },
];

export function AppSidebar({
  activePath,
  organization,
}: {
  activePath: string;
  organization: {
    name: string;
    photoUrl: string | null;
  };
}) {
  return (
    <aside className="hidden w-72 border-r border-[#dfe6ef] bg-white px-5 py-5 lg:block">
      <div className="mb-8 flex items-center gap-3">
        <OrbitMark className="size-10" priority />
        <div className="min-w-0">
          <p className="text-lg font-semibold">Orbit</p>
          <p className="truncate text-xs text-[#6b7890]">{organization.name}</p>
        </div>
      </div>

      <nav className="space-y-1" aria-label="Main navigation">
        {navigation.map((item) =>
          item.enabled && item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-[#536174] transition",
                activePath === item.href
                  ? "bg-[#eaf2ff] text-[#075bc9]"
                  : "hover:bg-[#f1f5f9] hover:text-[#172033]",
              )}
              aria-current={activePath === item.href ? "page" : undefined}
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          ) : (
            <div
              key={item.label}
              className="flex h-10 w-full cursor-not-allowed items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-[#9aa7b8]"
              title={`${item.label} belum aktif`}
            >
              <item.icon className="size-4" aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              <span className="rounded-sm bg-[#f1f5f9] px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                Soon
              </span>
            </div>
          ),
        )}
      </nav>
    </aside>
  );
}
