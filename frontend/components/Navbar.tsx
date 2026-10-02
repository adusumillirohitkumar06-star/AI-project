import Link from "next/link";

export function Navbar() {
  return (
    <header className="w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
            AI
          </div>
          <div>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base">
              AI Airport Operations & Gate Allocation Simulator
            </span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-mono rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              Phase 1
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-4 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          <Link
            href="/"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            Overview
          </Link>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            API Docs
          </a>
        </nav>
      </div>
    </header>
  );
}
