export const summaryStats = [
  { id: 1, title: "Total Residents", value: 1248, accent: "bg-indigo-100 text-indigo-700" },
  { id: 2, title: "Total Flats", value: 620, accent: "bg-emerald-100 text-emerald-700" },
  { id: 3, title: "Pending Complaints", value: 38, accent: "bg-amber-100 text-amber-700" },
  { id: 4, title: "Monthly Revenue", value: 2850000, prefix: "Rs ", accent: "bg-sky-100 text-sky-700" },
];

export const maintenanceCollection = [
  { month: "Jan", revenue: 2100000, expense: 1200000, collection: 75 },
  { month: "Feb", revenue: 2300000, expense: 1350000, collection: 82 },
  { month: "Mar", revenue: 2200000, expense: 1280000, collection: 79 },
  { month: "Apr", revenue: 2450000, expense: 1400000, collection: 86 },
  { month: "May", revenue: 2600000, expense: 1520000, collection: 88 },
  { month: "Jun", revenue: 2850000, expense: 1620000, collection: 91 },
];

export const complaintCategories = [
  { name: "Security", value: 18 },
  { name: "Maintenance", value: 34 },
  { name: "Housekeeping", value: 22 },
  { name: "Parking", value: 16 },
  { name: "Others", value: 10 },
];

export const recentActivities = [
  { id: 1, message: "Maintenance payment received from Flat A-702", time: "10 min ago" },
  { id: 2, message: "Visitor Rahul Mehta approved by Flat B-204", time: "25 min ago" },
  { id: 3, message: "Complaint #CMP-221 marked resolved", time: "1 hr ago" },
  { id: 4, message: "Gym booking confirmed for 6:00 PM", time: "2 hr ago" },
];

export const residentsData = [
  { id: 1, name: "Aarav Shah", flat: "A-101", phone: "9876543210", status: "Active" },
  { id: 2, name: "Isha Verma", flat: "B-204", phone: "9898989898", status: "Active" },
  { id: 3, name: "Rohan Nair", flat: "C-307", phone: "9811122233", status: "Inactive" },
  { id: 4, name: "Sneha Kapoor", flat: "A-502", phone: "9767676767", status: "Active" },
  { id: 5, name: "Kunal Joshi", flat: "D-110", phone: "9944556677", status: "Inactive" },
];

export const visitorsData = [
  { id: 1, name: "Sahil Kumar", purpose: "Delivery", flat: "A-301", status: "Approved", entry: "11:05 AM", exit: "11:20 AM" },
  { id: 2, name: "Priya Dutta", purpose: "Guest", flat: "C-120", status: "Pending", entry: "12:15 PM", exit: "-" },
  { id: 3, name: "Raj Malhotra", purpose: "Maintenance", flat: "B-410", status: "Denied", entry: "01:40 PM", exit: "01:41 PM" },
  { id: 4, name: "Mehul Jain", purpose: "Courier", flat: "D-215", status: "Approved", entry: "02:10 PM", exit: "02:26 PM" },
];

export const complaintsData = [
  { id: "CMP-301", title: "Water leakage in corridor", category: "Maintenance", priority: "High", status: "Open" },
  { id: "CMP-302", title: "Unauthorized parking in slot A-24", category: "Parking", priority: "Medium", status: "In Progress" },
  { id: "CMP-303", title: "CCTV blind spot near gate 2", category: "Security", priority: "High", status: "Resolved" },
  { id: "CMP-304", title: "Gym cleaning required", category: "Housekeeping", priority: "Low", status: "Open" },
];

export const billingData = [
  { id: "INV-9001", resident: "Aarav Shah", flat: "A-101", amount: 6500, month: "Jun 2026", status: "Paid" },
  { id: "INV-9002", resident: "Isha Verma", flat: "B-204", amount: 6500, month: "Jun 2026", status: "Unpaid" },
  { id: "INV-9003", resident: "Rohan Nair", flat: "C-307", amount: 6500, month: "Jun 2026", status: "Paid" },
  { id: "INV-9004", resident: "Sneha Kapoor", flat: "A-502", amount: 6500, month: "Jun 2026", status: "Paid" },
];

export const amenitiesData = [
  { id: 1, name: "Gym", availableSlots: ["06:00 AM", "07:00 AM", "06:00 PM", "07:00 PM"] },
  { id: 2, name: "Community Hall", availableSlots: ["10:00 AM", "12:00 PM", "05:00 PM", "08:00 PM"] },
  { id: 3, name: "Pool", availableSlots: ["07:00 AM", "08:00 AM", "04:00 PM", "06:00 PM"] },
];

export const expenseBreakdown = [
  { name: "Utilities", value: 30 },
  { name: "Staff", value: 25 },
  { name: "Repairs", value: 20 },
  { name: "Security", value: 15 },
  { name: "Others", value: 10 },
];

export const defaulters = [
  { name: "Isha Verma", flat: "B-204", due: 13000 },
  { name: "Kunal Joshi", flat: "D-110", due: 6500 },
  { name: "Neha Rao", flat: "C-212", due: 19500 },
];
