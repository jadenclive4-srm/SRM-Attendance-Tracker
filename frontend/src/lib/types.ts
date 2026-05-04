export type AttendanceStatus = "WFO" | "WFH" | "CLT" | "PTO" | "HOL";

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  WFO: "Work From Office",
  WFH: "Work From Home",
  CLT: "Client Location",
  PTO: "Paid Time Off",
  HOL: "Holiday",
};

export const STATUS_BADGE: Record<AttendanceStatus, string> = {
  WFO: "badge-status badge-wfo",
  WFH: "badge-status badge-wfh",
  CLT: "badge-status badge-clt",
  PTO: "badge-status badge-pto",
  HOL: "badge-status badge-hol",
};

export const STATUS_COLOR: Record<AttendanceStatus, string> = {
  WFO: "hsl(232 70% 56%)",
  WFH: "hsl(152 60% 42%)",
  CLT: "hsl(268 70% 60%)",
  PTO: "hsl(32 95% 54%)",
  HOL: "hsl(200 90% 50%)",
};

export const PRIORITY: Record<AttendanceStatus, number> = {
  WFO: 5, CLT: 4, WFH: 3, PTO: 2, HOL: 1,
};

export type Designation =
  | "Manager"
  | "Associate"
  | "Programmer Analyst"
  | "Programmer Analyst Trainee"
  | "Intern";

export const DESIGNATIONS: Designation[] = [
  "Manager", "Associate", "Programmer Analyst", "Programmer Analyst Trainee", "Intern",
];

export const DESIGNATION_RANK: Record<Designation, number> = {
  Manager: 5, Associate: 4, "Programmer Analyst": 3, "Programmer Analyst Trainee": 2, Intern: 1,
};

export interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  designation: Designation;
  team: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  avatarColor: string;
}

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  markedAt: string; // ISO time
  edited?: boolean;
}
