import Link from "next/link";
import { formatMoney, formatDate, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, type ProjectStatus } from "@/lib/constants";
import type { ProjectView } from "@/lib/data";

export function ProjectListItem({ project, showParty }: { project: ProjectView; showParty?: "customer" | "provider" }) {
  const party = showParty === "customer" ? project.customer : showParty === "provider" ? project.provider : null;
  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-sm shadow-black/[0.03] transition-colors hover:border-zinc-300 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-ink">{project.title}</p>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              PROJECT_STATUS_COLORS[project.status as ProjectStatus] ?? "bg-zinc-100 text-zinc-600"
            }`}
          >
            {PROJECT_STATUS_LABELS[project.status as ProjectStatus] ?? project.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">
          {formatMoney(project.price)} · {project.timelineDays}d delivery · created {formatDate(project.createdAt)}
          {party ? ` · with ${party.name}` : ""}
        </p>
      </div>
      <span className="shrink-0 text-sm font-medium text-muted">View →</span>
    </Link>
  );
}