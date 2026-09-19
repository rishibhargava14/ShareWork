function seeded(i, salt = 1) {
  return ((i * 9301 + salt * 49297) % 233280) / 233280;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

const USER_NAMES = [
  "Aarav Sharma",
  "Priya Patel",
  "Rohan Mehta",
  "Ananya Singh",
  "Vikram Rao",
  "Sneha Gupta",
  "Arjun Kapoor",
  "Kavya Reddy",
  "Ishaan Joshi",
  "Meera Nair",
  "Dev Malhotra",
  "Sara Ali",
  "Kabir Khan",
  "Riya Das",
  "Aditya Verma",
  "Nisha Shah",
  "Rahul Bose",
  "Tanya Suri",
  "Karan Gill",
  "Pooja Yadav",
];

export const users = USER_NAMES.map((name, f) => ({
  id: `USR-${1000 + f}`,
  name,
  email: `user${f + 1}@example.com`,
  role: f % 3 === 0 ? "Client" : f % 3 === 1 ? "Freelancer" : "Both",
  joined: `2024-${pad(Math.floor(seeded(f, 1) * 12) + 1)}-${pad(Math.floor(seeded(f, 2) * 28) + 1)}`,
  projects: Math.floor(seeded(f, 3) * 12) + 1,
  status: ["Active", "Active", "Active", "Suspended", "Active"][Math.floor(seeded(f, 4) * 5)],
  avatar: `https://i.pravatar.cc/100?img=${f + 5}`,
  spent: Math.floor(seeded(f, 5) * 50000) + 5000,
  rating: (4 + seeded(f, 6)).toFixed(1),
}));

const PROJECT_TITLES = [
  "E-commerce Redesign",
  "Mobile App UI",
  "SaaS Dashboard",
  "Figma to React",
  "Brand Identity",
  "Landing Page",
  "Admin Panel UX",
  "Payment Integration",
  "Logo & Guidelines",
  "Website Revamp",
  "iOS App Development",
  "API Integration",
  "Design System",
  "Startup Pitch Deck",
  "Webflow Site",
];

const PROJECT_PRICES = [2500, 4800, 12000, 3500, 1800, 2200, 6500, 4200, 900, 5600, 15000, 3800, 7200, 1500, 2900];
const PROJECT_ESCROW = [
  "Funded",
  "In Progress",
  "Delivered",
  "Paid",
  "Disputed",
  "Funded",
  "In Progress",
  "Paid",
  "Delivered",
  "Paid",
  "Disputed",
  "In Progress",
  "Funded",
  "Paid",
  "Delivered",
];

export const projects = PROJECT_TITLES.map((title, f) => {
  const price = PROJECT_PRICES[f];
  return {
    id: `PRJ-${2000 + f}`,
    client: users[f % 20].name,
    freelancer: users[(f + 7) % 20].name,
    title,
    price,
    escrow: PROJECT_ESCROW[f],
    date: `2024-11-${pad(10 + f)}`,
    fee: Math.round(price * 0.1),
  };
});

export const leakageItems = [
  { id: 1, user: "Rohan Mehta", type: "Phone", snippet: "my number is 98*** ***21 call me directly...", chatId: "CHAT-8821", count: 3, risk: "High", time: "2m ago" },
  { id: 2, user: "Sneha Gupta", type: "Email", snippet: "contact me at s***@gmail.com for faster...", chatId: "CHAT-8824", count: 1, risk: "Medium", time: "12m ago" },
  { id: 3, user: "Vikram Rao", type: "UPI", snippet: "pay directly to v***@okaxis to avoid fees...", chatId: "CHAT-8830", count: 2, risk: "High", time: "1h ago" },
  { id: 4, user: "Kabir Khan", type: "PayPal", snippet: "paypal.me/ka*** for direct payment...", chatId: "CHAT-8835", count: 1, risk: "High", time: "2h ago" },
  { id: 5, user: "Priya Patel", type: "Phone", snippet: "whatsapp me 98*** ***45...", chatId: "CHAT-8841", count: 4, risk: "Critical", time: "3h ago" },
  { id: 6, user: "Arjun Kapoor", type: "Email", snippet: "my personal email is ar***@outlook...", chatId: "CHAT-8849", count: 1, risk: "Medium", time: "5h ago" },
  { id: 7, user: "Meera Nair", type: "Link", snippet: "lets connect on linkedin.com/in/me***...", chatId: "CHAT-8852", count: 1, risk: "Low", time: "6h ago" },
  { id: 8, user: "Dev Malhotra", type: "Phone", snippet: "call 98*** ***90 after 6pm...", chatId: "CHAT-8858", count: 2, risk: "High", time: "8h ago" },
];

export const revenueData = [
  { m: "Jan", rev: 42000, users: 180 },
  { m: "Feb", rev: 51000, users: 220 },
  { m: "Mar", rev: 48000, users: 260 },
  { m: "Apr", rev: 62000, users: 310 },
  { m: "May", rev: 58000, users: 340 },
  { m: "Jun", rev: 71000, users: 400 },
  { m: "Jul", rev: 85000, users: 480 },
  { m: "Aug", rev: 79000, users: 520 },
];

export const projectStatus = [
  { name: "Completed", value: 68 },
  { name: "In Progress", value: 22 },
  { name: "Disputed", value: 6 },
  { name: "Cancelled", value: 4 },
];

export const disputes = [
  { id: "DSP-001", project: "PRJ-2004", client: "Ananya Singh", freelancer: "Vikram Rao", reason: "Deliverables not as per agreement", amount: 12000, status: "Open", priority: "High" },
  { id: "DSP-002", project: "PRJ-2010", client: "Kabir Khan", freelancer: "Rohan Mehta", reason: "Missed deadline, no communication", amount: 15000, status: "Open", priority: "Critical" },
  { id: "DSP-003", project: "PRJ-2007", client: "Priya Patel", freelancer: "Aarav Sharma", reason: "Client asking extra work beyond scope", amount: 4200, status: "Review", priority: "Medium" },
];

export const defaultCategories = [
  { id: 1, name: "UI/UX Design", projects: 142, icon: "🎨", color: "bg-violet-500" },
  { id: 2, name: "Web Development", projects: 210, icon: "💻", color: "bg-blue-500" },
  { id: 3, name: "App Development", projects: 98, icon: "📱", color: "bg-emerald-500" },
  { id: 4, name: "Figma Services", projects: 76, icon: "🔶", color: "bg-orange-500" },
  { id: 5, name: "IT Services", projects: 124, icon: "⚙️", color: "bg-zinc-500" },
];

export const disputeChart = [
  { d: "Mon", v: 2 },
  { d: "Tue", v: 3 },
  { d: "Wed", v: 1 },
  { d: "Thu", v: 4 },
  { d: "Fri", v: 2 },
  { d: "Sat", v: 1 },
];
