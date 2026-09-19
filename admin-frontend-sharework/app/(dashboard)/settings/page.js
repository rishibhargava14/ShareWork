import PlatformFees from "@/components/settings/PlatformFees";
import SecuritySettings from "@/components/settings/SecuritySettings";

export default function SettingsPage() {
  return (
    <div className="max-w-[800px] space-y-4">
      <PlatformFees />
      <SecuritySettings />
    </div>
  );
}
