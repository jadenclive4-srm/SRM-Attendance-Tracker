import { Employee, AttendanceRecord, AttendanceStatus, Designation } from "./types";

const FIRST = ["Aarav","Priya","Rohan","Neha","Vikram","Ananya","Karthik","Divya","Arjun","Meera","Rahul","Sneha","Aditya","Pooja","Siddharth","Riya","Nikhil","Shreya","Manish","Ishita","Akash","Tanvi","Varun","Kavya","Suresh"];
const LAST = ["Sharma","Patel","Iyer","Reddy","Mehta","Verma","Kapoor","Nair","Joshi","Singh","Rao","Das","Bose","Khan","Chopra"];
const TEAMS = ["Platform","Payments","Growth","Analytics","Mobile","Cloud Infra","Design Systems","Customer Success"];
const DESIGS: Designation[] = ["Manager","Associate","Programmer Analyst","Programmer Analyst Trainee","Intern"];
const COLORS = ["#6366F1","#22C55E","#F59E0B","#A855F7","#0EA5E9","#EC4899","#14B8A6","#EF4444"];

function seeded(i: number) { return (Math.sin(i * 9301 + 49297) * 233280) % 1; }
function rand(i: number, n: number) { return Math.abs(Math.floor(seeded(i) * n)) % n; }

export function generateEmployees(): Employee[] {
  const list: Employee[] = [];
  for (let i = 0; i < 24; i++) {
    const fn = FIRST[rand(i + 1, FIRST.length)];
    const ln = LAST[rand(i + 7, LAST.length)];
    list.push({
      id: `emp-${i + 1}`,
      employeeId: `EMP${(1001 + i).toString()}`,
      fullName: `${fn} ${ln}`,
      designation: DESIGS[rand(i + 3, DESIGS.length)],
      team: TEAMS[rand(i + 5, TEAMS.length)],
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@acme.com`,
      phone: `+91 9${(800000000 + i * 13579).toString().slice(0, 9)}`,
      city: ["Bengaluru","Hyderabad","Pune","Mumbai","Chennai"][rand(i + 11, 5)],
      state: ["Karnataka","Telangana","Maharashtra","Maharashtra","Tamil Nadu"][rand(i + 11, 5)],
      country: "India",
      pincode: `5600${(10 + i).toString()}`,
      avatarColor: COLORS[i % COLORS.length],
    });
  }
  return list;
}

const STATUSES: AttendanceStatus[] = ["WFO","WFH","CLT","PTO","HOL"];

export function generateAttendance(empSeed: number, monthsBack = 3): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    const dayKey = d.toISOString().slice(0, 10);
    const seed = empSeed * 31 + d.getDate() + d.getMonth() * 41;
    let status: AttendanceStatus;
    if (dow === 0 || dow === 6) {
      if (Math.abs(Math.sin(seed)) > 0.85) status = "HOL"; else continue;
    } else {
      const r = Math.abs(Math.sin(seed));
      if (r < 0.45) status = "WFO";
      else if (r < 0.72) status = "WFH";
      else if (r < 0.85) status = "CLT";
      else if (r < 0.94) status = "PTO";
      else status = "HOL";
    }
    // Skip last 1-2 days for some employees (Not Marked)
    const daysAgo = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (daysAgo === 0 && empSeed % 3 === 0) continue;
    records.push({
      date: dayKey,
      status,
      markedAt: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9 + (seed % 3), 15 + (seed % 40)).toISOString(),
    });
  }
  return records;
}

export const EMPLOYEES = generateEmployees();
export const ATTENDANCE: Record<string, AttendanceRecord[]> = Object.fromEntries(
  EMPLOYEES.map((e, i) => [e.id, generateAttendance(i + 1)])
);

// Current user (mock session)
export const CURRENT_USER: Employee = {
  id: "me",
  employeeId: "EMP2025",
  fullName: "Alex Morgan",
  designation: "Programmer Analyst",
  team: "Platform",
  email: "alex.morgan@acme.com",
  phone: "+91 9876543210",
  city: "Bengaluru",
  state: "Karnataka",
  country: "India",
  pincode: "560034",
  avatarColor: "#6366F1",
};
ATTENDANCE[CURRENT_USER.id] = generateAttendance(99);
