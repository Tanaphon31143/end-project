import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  FlaskConical,
  Calculator,
  Palette,
  Globe,
  Landmark,
  Languages,
  Activity,
  Cpu,
  GraduationCap,
} from "lucide-react";

export type SubjectTheme = {
  key: string;
  name: string;
  cardIconBg: string;
  cardIconColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  cellBg: string;
  cellBorder: string;
  cellText: string;
  cellSubtext: string;
  cellIconBg: string;
  cellIconColor: string;
  pillBg: string;
  pillText: string;
  pillBorder: string;
  accentBar: string;
  Icon: LucideIcon;
};

const themes: Record<string, Omit<SubjectTheme, "key" | "name">> = {
  purple: {
    cardIconBg: "bg-purple-600 text-white shadow-purple-500/20",
    cardIconColor: "text-white",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-700",
    badgeBorder: "border-purple-200/70",
    cellBg: "bg-purple-50/90 hover:bg-purple-100/90",
    cellBorder: "border-purple-200",
    cellText: "text-purple-950",
    cellSubtext: "text-purple-700",
    cellIconBg: "bg-purple-600 text-white",
    cellIconColor: "text-white",
    pillBg: "bg-purple-100/80",
    pillText: "text-purple-800",
    pillBorder: "border-purple-200",
    accentBar: "bg-purple-500",
    Icon: Palette,
  },
  blue: {
    cardIconBg: "bg-blue-600 text-white shadow-blue-500/20",
    cardIconColor: "text-white",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    badgeBorder: "border-blue-200/70",
    cellBg: "bg-blue-50/90 hover:bg-blue-100/90",
    cellBorder: "border-blue-200",
    cellText: "text-blue-950",
    cellSubtext: "text-blue-700",
    cellIconBg: "bg-blue-600 text-white",
    cellIconColor: "text-white",
    pillBg: "bg-blue-100/80",
    pillText: "text-blue-800",
    pillBorder: "border-blue-200",
    accentBar: "bg-blue-500",
    Icon: FlaskConical,
  },
  emerald: {
    cardIconBg: "bg-emerald-600 text-white shadow-emerald-500/20",
    cardIconColor: "text-white",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    badgeBorder: "border-emerald-200/70",
    cellBg: "bg-emerald-50/90 hover:bg-emerald-100/90",
    cellBorder: "border-emerald-200",
    cellText: "text-emerald-950",
    cellSubtext: "text-emerald-700",
    cellIconBg: "bg-emerald-600 text-white",
    cellIconColor: "text-white",
    pillBg: "bg-emerald-100/80",
    pillText: "text-emerald-800",
    pillBorder: "border-emerald-200",
    accentBar: "bg-emerald-500",
    Icon: Calculator,
  },
  rose: {
    cardIconBg: "bg-rose-600 text-white shadow-rose-500/20",
    cardIconColor: "text-white",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-700",
    badgeBorder: "border-rose-200/70",
    cellBg: "bg-rose-50/90 hover:bg-rose-100/90",
    cellBorder: "border-rose-200",
    cellText: "text-rose-950",
    cellSubtext: "text-rose-700",
    cellIconBg: "bg-rose-600 text-white",
    cellIconColor: "text-white",
    pillBg: "bg-rose-100/80",
    pillText: "text-rose-800",
    pillBorder: "border-rose-200",
    accentBar: "bg-rose-500",
    Icon: Languages,
  },
  sky: {
    cardIconBg: "bg-sky-600 text-white shadow-sky-500/20",
    cardIconColor: "text-white",
    badgeBg: "bg-sky-50",
    badgeText: "text-sky-700",
    badgeBorder: "border-sky-200/70",
    cellBg: "bg-sky-50/90 hover:bg-sky-100/90",
    cellBorder: "border-sky-200",
    cellText: "text-sky-950",
    cellSubtext: "text-sky-700",
    cellIconBg: "bg-sky-600 text-white",
    cellIconColor: "text-white",
    pillBg: "bg-sky-100/80",
    pillText: "text-sky-800",
    pillBorder: "border-sky-200",
    accentBar: "bg-sky-500",
    Icon: Globe,
  },
  amber: {
    cardIconBg: "bg-amber-600 text-white shadow-amber-500/20",
    cardIconColor: "text-white",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-200/70",
    cellBg: "bg-amber-50/90 hover:bg-amber-100/90",
    cellBorder: "border-amber-200",
    cellText: "text-amber-950",
    cellSubtext: "text-amber-700",
    cellIconBg: "bg-amber-600 text-white",
    cellIconColor: "text-white",
    pillBg: "bg-amber-100/80",
    pillText: "text-amber-800",
    pillBorder: "border-amber-200",
    accentBar: "bg-amber-500",
    Icon: Landmark,
  },
  teal: {
    cardIconBg: "bg-teal-600 text-white shadow-teal-500/20",
    cardIconColor: "text-white",
    badgeBg: "bg-teal-50",
    badgeText: "text-teal-700",
    badgeBorder: "border-teal-200/70",
    cellBg: "bg-teal-50/90 hover:bg-teal-100/90",
    cellBorder: "border-teal-200",
    cellText: "text-teal-950",
    cellSubtext: "text-teal-700",
    cellIconBg: "bg-teal-600 text-white",
    cellIconColor: "text-white",
    pillBg: "bg-teal-100/80",
    pillText: "text-teal-800",
    pillBorder: "border-teal-200",
    accentBar: "bg-teal-500",
    Icon: Activity,
  },
  indigo: {
    cardIconBg: "bg-indigo-600 text-white shadow-indigo-500/20",
    cardIconColor: "text-white",
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-700",
    badgeBorder: "border-indigo-200/70",
    cellBg: "bg-indigo-50/90 hover:bg-indigo-100/90",
    cellBorder: "border-indigo-200",
    cellText: "text-indigo-950",
    cellSubtext: "text-indigo-700",
    cellIconBg: "bg-indigo-600 text-white",
    cellIconColor: "text-white",
    pillBg: "bg-indigo-100/80",
    pillText: "text-indigo-800",
    pillBorder: "border-indigo-200",
    accentBar: "bg-indigo-500",
    Icon: Cpu,
  },
};

const themeKeys = [
  "blue",
  "purple",
  "teal",
  "emerald",
  "rose",
  "sky",
  "amber",
  "indigo",
];

export function getSubjectTheme(
  subjectName: string,
  subjectCode: string,
  index = 0,
): SubjectTheme {
  const name = (subjectName || "").toLowerCase();
  const code = (subjectCode || "").trim();

  let key = themeKeys[index % themeKeys.length];

  if (
    name.includes("ศิลปะ") ||
    name.includes("ดนตรี") ||
    name.includes("นาฏศิลป์") ||
    name.includes("art") ||
    code.startsWith("ศ") ||
    code.startsWith("#")
  ) {
    key = "purple";
  } else if (
    name.includes("วิทย์") ||
    name.includes("วิทยาศาสตร์") ||
    name.includes("เคมี") ||
    name.includes("ชีว") ||
    name.includes("ฟิสิกส์") ||
    name.includes("ดาราศาสตร์") ||
    name.includes("science") ||
    code.startsWith("ว")
  ) {
    key = "blue";
  } else if (
    name.includes("คณิต") ||
    name.includes("เลข") ||
    name.includes("math") ||
    code.startsWith("ค")
  ) {
    key = "emerald";
  } else if (
    name.includes("ไทย") ||
    name.includes("thai") ||
    code.startsWith("ท")
  ) {
    key = "rose";
  } else if (
    name.includes("อังกฤษ") ||
    name.includes("ภาษาต่างประเทศ") ||
    name.includes("english") ||
    code.startsWith("อ")
  ) {
    key = "sky";
  } else if (
    name.includes("สังคม") ||
    name.includes("ประวัติศาสตร์") ||
    name.includes("ศาสนา") ||
    name.includes("หน้าที่พลเมือง") ||
    code.startsWith("ส")
  ) {
    key = "amber";
  } else if (
    name.includes("สุขศึกษา") ||
    name.includes("พลศึกษา") ||
    name.includes("พละ") ||
    code.startsWith("พ")
  ) {
    key = "teal";
  } else if (
    name.includes("การงาน") ||
    name.includes("เทคโนโลยี") ||
    name.includes("คอม") ||
    name.includes("วิทยาการคำนวณ") ||
    code.startsWith("ง")
  ) {
    key = "indigo";
  }

  const base = themes[key] || themes.blue;
  return {
    key,
    name: subjectName,
    ...base,
  };
}

export function formatRoomName(room?: string, className?: string): string {
  if (!room || room === "ยังไม่ระบุ" || room.trim() === "") {
    return "ห้องเรียนประจำ";
  }
  if (className && room === className) {
    return "ห้องเรียนประจำ";
  }
  return room;
}

export const WEEKDAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const dayThemes: Record<
  string,
  {
    label: string;
    shortLabel: string;
    bg: string;
    text: string;
    border: string;
    accent: string;
  }
> = {
  จันทร์: {
    label: "จันทร์",
    shortLabel: "จ.",
    bg: "bg-amber-50 text-amber-900 border-amber-200/80",
    text: "text-amber-800",
    border: "border-amber-200",
    accent: "bg-amber-400",
  },
  อังคาร: {
    label: "อังคาร",
    shortLabel: "อ.",
    bg: "bg-pink-50 text-pink-900 border-pink-200/80",
    text: "text-pink-800",
    border: "border-pink-200",
    accent: "bg-pink-400",
  },
  พุธ: {
    label: "พุธ",
    shortLabel: "พ.",
    bg: "bg-emerald-50 text-emerald-900 border-emerald-200/80",
    text: "text-emerald-800",
    border: "border-emerald-200",
    accent: "bg-emerald-400",
  },
  พฤหัสบดี: {
    label: "พฤหัสบดี",
    shortLabel: "พฤ.",
    bg: "bg-orange-50 text-orange-900 border-orange-200/80",
    text: "text-orange-800",
    border: "border-orange-200",
    accent: "bg-orange-400",
  },
  ศุกร์: {
    label: "ศุกร์",
    shortLabel: "ศ.",
    bg: "bg-sky-50 text-sky-900 border-sky-200/80",
    text: "text-sky-800",
    border: "border-sky-200",
    accent: "bg-sky-400",
  },
  เสาร์: {
    label: "เสาร์",
    shortLabel: "ส.",
    bg: "bg-purple-50 text-purple-900 border-purple-200/80",
    text: "text-purple-800",
    border: "border-purple-200",
    accent: "bg-purple-400",
  },
  อาทิตย์: {
    label: "อาทิตย์",
    shortLabel: "อา.",
    bg: "bg-rose-50 text-rose-900 border-rose-200/80",
    text: "text-rose-800",
    border: "border-rose-200",
    accent: "bg-rose-400",
  },
};

export const dayPills = dayThemes;
