import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { CATEGORIES } from "@/lib/constants";

const packageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    price: { type: Number, required: true, min: 1 },
    deliveryDays: { type: Number, required: true, min: 1 },
    description: { type: String, trim: true, maxlength: 500 },
    features: { type: [String], default: [] },
  },
  { _id: true }
);

const serviceSchema = new Schema(
  {
    provider: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, required: true, enum: CATEGORIES, index: true },
    skills: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    price: { type: Number, required: true, min: 1 },
    deliveryDays: { type: Number, required: true, min: 1 },
    active: { type: Boolean, default: true },
    packages: { type: [packageSchema], default: [] },
  },
  { timestamps: true }
);

serviceSchema.index({ title: 1, category: 1, price: 1, active: 1 });

export type ServiceDoc = InferSchemaType<typeof serviceSchema>;

export interface PublicService {
  id: string;
  provider: PublicServiceProvider;
  title: string;
  description: string;
  category: string;
  skills: string[];
  tags: string[];
  price: number;
  deliveryDays: number;
  active: boolean;
  packages: Array<{
    id?: string;
    name: string;
    price: number;
    deliveryDays: number;
    description?: string;
    features: string[];
  }>;
  createdAt: string;
}

export interface PublicServiceProvider {
  id: string;
  name: string;
  title?: string;
  bio?: string;
  skills: string[];
  location?: string;
  rating?: number;
  reviews?: number;
  online?: boolean;
}

export function toPublicService(service: ServiceDoc): PublicService {
  const s = service as ServiceDoc & {
    _id: unknown;
    provider: {
      _id: unknown;
      name: string;
      title?: string;
      bio?: string;
      skills?: string[];
      location?: string;
      rating?: number;
      reviews?: number;
      online?: boolean;
    };
    createdAt?: Date;
  };
  const provider = Array.isArray(s.provider) ? s.provider[0] : s.provider;
  return {
    id: String(s._id),
    provider: {
      id: String(provider._id),
      name: provider.name,
      title: provider.title,
      bio: provider.bio,
      skills: provider.skills ?? [],
      location: provider.location,
      rating: provider.rating ?? 0,
      reviews: provider.reviews ?? 0,
      online: !!provider.online,
    },
    title: s.title,
    description: s.description,
    category: s.category,
    skills: s.skills ?? [],
    tags: s.tags ?? [],
    price: s.price,
    deliveryDays: s.deliveryDays,
    active: s.active,
    packages: (s.packages ?? []).map((p) => ({
      id: String((p as unknown as { _id?: unknown })._id ?? ""),
      name: p.name,
      price: p.price,
      deliveryDays: p.deliveryDays,
      description: p.description ?? undefined,
      features: p.features ?? [],
    })),
    createdAt: s.createdAt?.toISOString() ?? "",
  };
}

export default mongoose.models.Service ??
  (mongoose.model("Service", serviceSchema) as mongoose.Model<ServiceDoc>);