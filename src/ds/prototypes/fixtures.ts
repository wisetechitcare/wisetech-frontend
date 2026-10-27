/** Demo data for the gallery screens only — fictional people, no tenant data. */
export type Status = "present" | "late" | "leave" | "absent" | "remote"

export interface Person {
  id: string
  name: string
  role: string
  department: string
  location: string
  status: Status
  joined: string
  manager: string
  leave: number
  email: string
}

export const PEOPLE: Person[] = [
  { id: "E-1042", name: "Aarav Sharma", role: "Senior MEP Engineer", department: "Engineering", location: "Mumbai", status: "present", joined: "12 Mar 2022", manager: "Neha Iyer", leave: 12.5, email: "aarav.sharma@example.com" },
  { id: "E-1057", name: "Diya Nair", role: "HR Business Partner", department: "People", location: "Pune", status: "leave", joined: "03 Jan 2023", manager: "Kabir Rao", leave: 6, email: "diya.nair@example.com" },
  { id: "E-1063", name: "Kabir Rao", role: "Head of People", department: "People", location: "Mumbai", status: "present", joined: "18 Jul 2019", manager: "—", leave: 18, email: "kabir.rao@example.com" },
  { id: "E-1071", name: "Meera Joshi", role: "Project Manager", department: "Projects", location: "Bengaluru", status: "remote", joined: "22 Aug 2021", manager: "Neha Iyer", leave: 9, email: "meera.joshi@example.com" },
  { id: "E-1088", name: "Rohan Mehta", role: "Accounts Executive", department: "Finance", location: "Mumbai", status: "late", joined: "09 Feb 2024", manager: "Sana Khan", leave: 9.5, email: "rohan.mehta@example.com" },
  { id: "E-1094", name: "Sana Khan", role: "Finance Controller", department: "Finance", location: "Mumbai", status: "present", joined: "30 Sep 2020", manager: "—", leave: 14, email: "sana.khan@example.com" },
  { id: "E-1101", name: "Vihaan Gupta", role: "Site Engineer", department: "Engineering", location: "Thane", status: "absent", joined: "15 May 2024", manager: "Aarav Sharma", leave: 3, email: "vihaan.gupta@example.com" },
  { id: "E-1112", name: "Neha Iyer", role: "Engineering Director", department: "Engineering", location: "Mumbai", status: "present", joined: "02 Apr 2018", manager: "—", leave: 21, email: "neha.iyer@example.com" },
]

export const STATUS_META: Record<Status, { label: string; variant: "success" | "warning" | "info" | "danger" | "brand" }> = {
  present: { label: "Present", variant: "success" },
  late: { label: "Late", variant: "warning" },
  leave: { label: "On leave", variant: "info" },
  absent: { label: "Absent", variant: "danger" },
  remote: { label: "Remote", variant: "brand" },
}

export const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
