import { api } from "@/lib/api";
import { GIG_CATEGORIES } from "@/lib/express";

type CategoryRow = { name?: string };

export async function fetchActiveCategories(): Promise<string[]> {
  try {
    const res = await api<{ categories?: CategoryRow[] }>("/api/categories");
    const names = (res.categories ?? []).map((item) => String(item.name ?? "").trim()).filter(Boolean);
    if (names.length > 0) return names;
  } catch {
    // Use the seeded system names when the public category API is unavailable.
  }
  return [...GIG_CATEGORIES];
}
