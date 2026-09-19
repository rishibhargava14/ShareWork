import { TriangleAlert } from "lucide-react";

export default function AutoReleaseNotice() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-[20px] p-4">
      <div className="flex gap-2">
        <TriangleAlert className="w-4 h-4 text-amber-600 mt-0.5" />
        <div>
          <div className="text-[12px] font-medium text-amber-900">No auto-release timer</div>
          <div className="text-[11px] text-amber-700 mt-1">
            Escrow releases only after customer approval or an admin refund on a locked dispute. The backend does not auto-release after 72h.
          </div>
        </div>
      </div>
    </div>
  );
}
