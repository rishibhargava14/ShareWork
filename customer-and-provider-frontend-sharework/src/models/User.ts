import mongoose, { Schema, type InferSchemaType } from "mongoose";
import type { Role } from "@/lib/constants";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["customer", "provider", "admin"], required: true, index: true },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    // Provider profile fields + shared profile fields:
    title: { type: String, trim: true, maxlength: 80 },
    bio: { type: String, trim: true, maxlength: 1000 },
    skills: { type: [String], default: [] },
    location: { type: String, trim: true, maxlength: 80 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviews: { type: Number, min: 0, default: 0 },
    online: { type: Boolean, default: false },
    availabilityDays: { type: [String], default: [] },
  },
  { timestamps: true }
);

export type UserModel = InferSchemaType<typeof userSchema>;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  status: "active" | "suspended";
  title?: string;
  bio?: string;
  skills: string[];
  location?: string;
  rating?: number;
  reviews?: number;
  online?: boolean;
  availabilityDays?: string[];
  isVerified?: boolean;
  createdAt: string;
};

export function toPublicUser(user: UserModel & { _id: unknown }): PublicUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone as string | undefined,
    role: user.role as Role,
    status: user.status as "active" | "suspended",
    title: user.title ?? undefined,
    bio: user.bio ?? undefined,
    skills: user.skills ?? [],
    location: user.location ?? undefined,
    rating: typeof user.rating === "number" ? user.rating : 0,
    reviews: typeof user.reviews === "number" ? user.reviews : 0,
    online: !!user.online,
    availabilityDays: user.availabilityDays ?? [],
    createdAt: (user as unknown as { createdAt?: Date }).createdAt?.toISOString() ?? "",
  };
}

export default mongoose.models.User ??
  (mongoose.model("User", userSchema) as mongoose.Model<UserModel>);