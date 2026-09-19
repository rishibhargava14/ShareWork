export function formatInr(amount) {
  const value = Number(amount) || 0;
  return `₹${value.toLocaleString("en-IN")}`;
}

export function formatDay(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN");
}

export function roleLabel(role) {
  if (role === "customer") return "Client";
  if (role === "provider") return "Freelancer";
  return role || "User";
}

export function escrowLabel(status) {
  if (status === "locked") return "Funded";
  if (status === "released") return "Paid";
  if (status === "refunded") return "Refunded";
  if (status === "split") return "Split";
  if (status === "pending") return "Pending";
  return status || "Pending";
}

export function initialsAvatar(name) {
  const letters = String(name || "SW")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(letters || "SW")}`;
}
