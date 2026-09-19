export default function SecuritySettings() {
  return (
    <div className="bg-white border border-zinc-200 rounded-[20px] p-6">
      <h3 className="text-[14px] font-semibold">Security</h3>
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200">
          <div>
            <div className="text-[13px] font-medium">Admin login OTP</div>
            <div className="text-[11px] text-zinc-500">Verified admin login issues an email OTP before JWT</div>
          </div>
          <div className="text-[11px] font-medium text-emerald-700">Enforced</div>
        </div>
        <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200">
          <div>
            <div className="text-[13px] font-medium">Leakage Auto-block</div>
            <div className="text-[11px] text-zinc-500">Chat leakage is masked and logged by the backend</div>
          </div>
          <div className="text-[11px] font-medium text-emerald-700">Enforced</div>
        </div>
      </div>
    </div>
  );
}
