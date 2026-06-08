const personalAttendance = {
    id: "erelkwkrj3krj3klrek342424",
    date: "13 Aug, 2024",
    day: "Tuesday",
    checkIn: "10:00 AM",
    checkOut: "07:00 PM",
    duration: "08:00 Hrs",
    status: "Present",
};

const employeeTodayAttendance = {
    id: "WT-04",
    name: "Anas Ansari",
    date: "17 Aug, 2024",
    day: "Wednesday",
    checkIn: "10:00 AM",
    checkOut: "07:00 PM",
    duration: "08:00 Hrs",
    status: "Present",
    work: "Office",
    location: "Jogeshwari, Mumbai"
};

const employeeWeeklyAttendance = {
    id: "WT-04",
    name: "Anas Ansari",
    mon: "Present",
    tue: "Absent",
    wed: "Check in missing",
    thu: "Present",
    fri: "Check out missing",
    sat: "Weekend",
    sun: "Weekend",
    total: 5,
    present: 4,
    late: 2,
    extra: 0
}

export const personalAttendanceData = new Array(30).fill(0).map((_, i) => ({
    ...personalAttendance,
    ...(i % 1 === 0 && { status: "Present" }),
    ...(i % 2 === 0 && { status: "Absent" }),
    ...(i % 3 === 0 && { status: "Check in missing" }),
    ...(i % 4 === 0 && { status: "Check out missing" })
}));

export const employeeTodayAttendanceData = new Array(30).fill(0).map((_, i) => ({
    ...employeeTodayAttendance,
    ...(i % 1 === 0 && { status: "Present" }),
    ...(i % 2 === 0 && { status: "Absent" }),
    ...(i % 3 === 0 && { status: "Check in missing" }),
    ...(i % 4 === 0 && { status: "Check out missing" })
}));

export const employeeWeeklyAttendanceData = new Array(30).fill(0).map(() => ({ ...employeeWeeklyAttendance }));

export const colors = {
    present: '#58AC9D',
    absent: '#BB6565',
    checkInMissing: '#58AC9D',
    checkOutMissing: '#58AC9D'
} 