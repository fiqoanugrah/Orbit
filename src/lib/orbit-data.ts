import {
  CalendarDays,
  ClipboardCheck,
  ReceiptText,
  Users,
  Wallet,
} from "lucide-react";

export const dashboardStats = [
  {
    label: "Active Students",
    value: "128",
    delta: "+12 bulan ini",
    icon: Users,
    tone: "bg-[#eaf2ff] text-[#0b6ffb]",
  },
  {
    label: "Today Classes",
    value: "9",
    delta: "3 berjalan",
    icon: CalendarDays,
    tone: "bg-[#fff3d9] text-[#9c6400]",
  },
  {
    label: "Attendance",
    value: "84%",
    delta: "hari ini",
    icon: ClipboardCheck,
    tone: "bg-[#e7f8ef] text-[#16834a]",
  },
  {
    label: "Monthly Revenue",
    value: "Rp42,7 jt",
    delta: "+8%",
    icon: Wallet,
    tone: "bg-[#f0edff] text-[#6454d6]",
  },
  {
    label: "Outstanding",
    value: "Rp8,9 jt",
    delta: "17 invoice",
    icon: ReceiptText,
    tone: "bg-[#ffecec] text-[#c73535]",
  },
  {
    label: "New Students",
    value: "14",
    delta: "semester ini",
    icon: Users,
    tone: "bg-[#e7fbfb] text-[#0d7d83]",
  },
];

export const activeClasses = [
  {
    name: "Gold Robotics Sabtu",
    program: "Gold Robotics",
    teacher: "Fiqo",
    room: "Lab 1",
    schedule: "Sabtu, 13.00",
    current: 8,
    max: 10,
    status: "Attendance Open",
  },
  {
    name: "Coding Intermediate",
    program: "Coding Intermediate",
    teacher: "Nadia",
    room: "Studio 2",
    schedule: "Senin, 16.30",
    current: 6,
    max: 8,
    status: "Scheduled",
  },
  {
    name: "Silver Robotics Rabu",
    program: "Silver Robotics",
    teacher: "Adit",
    room: "Lab 2",
    schedule: "Rabu, 15.00",
    current: 9,
    max: 12,
    status: "Scheduled",
  },
];

export const financeRows = [
  {
    invoice: "INV-2026-0727-001",
    student: "Rafif Maulana",
    amount: "Rp675.000",
    method: "Transfer" as const,
    status: "Partial",
  },
  {
    invoice: "INV-2026-0727-002",
    student: "Adit Pratama",
    amount: "Rp1.400.000",
    method: "QRIS" as const,
    status: "Paid",
  },
  {
    invoice: "INV-2026-0727-003",
    student: "Kevin Ardi",
    amount: "Rp675.000",
    method: "Cash" as const,
    status: "Unpaid",
  },
];

export const students = [
  {
    name: "Rafif Maulana",
    programs: ["Gold Robotics", "Coding Intermediate"],
    status: "Active",
  },
  {
    name: "Adit Pratama",
    programs: ["Gold Robotics"],
    status: "Active",
  },
  {
    name: "Kevin Ardi",
    programs: ["Silver Robotics"],
    status: "Active",
  },
];

export const moduleGroups = {
  flow: [
    "Parent",
    "Student",
    "Pilih Program",
    "Pilih Paket",
    "Pilih Class",
    "Create Enrollment",
    "Generate Invoice",
    "Payment",
  ],
  mvp: [
    "Dashboard",
    "Students",
    "Parents",
    "Teachers",
    "Categories",
    "Programs",
    "Paket",
    "Classes",
    "Enrollment",
    "Attendance",
    "Academic Period",
    "Invoices",
    "Payments",
    "Reports",
    "Settings",
  ],
};
