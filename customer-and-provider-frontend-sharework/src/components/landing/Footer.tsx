export default function Footer() {
  return (
    <footer className="border-t border-[#E4E5E7] bg-white">
      <div className="mx-auto flex max-w-[1400px] flex-col justify-between gap-4 px-4 py-8 text-[12px] text-[#62646A] md:flex-row md:px-8">
        <div>
          <span className="font-bold text-[#222325]">sharework</span>
          <span className="mx-2 text-[#B5B6BA]">•</span>
          Fixed price only
          <span className="mx-2 text-[#B5B6BA]">•</span>
          Escrow protected
        </div>
        <div className="text-[#95979D]">
          © {new Date().getFullYear()} ShareWork. Built for clear, fixed-price work.
        </div>
      </div>
    </footer>
  );
}
