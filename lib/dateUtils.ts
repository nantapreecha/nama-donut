export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function todayISO(): string {
  return startOfDay(new Date()).toISOString().split("T")[0];
}

// คำนวณรอบเวลาตามวันและประเภทออเดอร์
// วันธรรมดา: WALKIN 09:30/11:30/13:30, RESERVE 10:30/12:30/14:30
// เสาร์-อาทิตย์: WALKIN 10:30/12:30/14:30, RESERVE 11:30/13:30/15:30
export function getTimeSlots(date: Date, orderType: "WALKIN" | "RESERVE"): string[] {
  const day = date.getDay(); // 0=Sun, 6=Sat
  const isWeekend = day === 0 || day === 6;

  const walkInWeekday = ["09:30", "11:30", "13:30"];
  const walkInWeekend = ["10:30", "12:30", "14:30"];
  const reserveWeekday = ["10:30", "12:30", "14:30"];
  const reserveWeekend = ["11:30", "13:30", "15:30"];

  if (orderType === "WALKIN") return isWeekend ? walkInWeekend : walkInWeekday;
  return isWeekend ? reserveWeekend : reserveWeekday;
}
