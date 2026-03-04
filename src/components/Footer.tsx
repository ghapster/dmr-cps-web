export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo + tagline */}
          <div className="flex items-center gap-3">
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 text-primary-light"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M5.636 18.364a9 9 0 0 1 0-12.728M18.364 5.636a9 9 0 0 1 0 12.728" />
              <path d="M8.464 15.536a5 5 0 0 1 0-7.072M15.536 8.464a5 5 0 0 1 0 7.072" />
              <circle cx="12" cy="12" r="1" fill="currentColor" />
            </svg>
            <span className="text-sm font-semibold text-white">AnyProg</span>
            <span className="text-xs text-gray-600">|</span>
            <span className="text-xs text-gray-500">
              Web-based CPS for Anytone D578UV
            </span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-300 transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-gray-300 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-gray-300 transition-colors">
              FAQ
            </a>
            <a
              href="https://ghapster.github.io/dmr-cps-web/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-300 transition-colors"
            >
              Launch App
            </a>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-600">
          &copy; {new Date().getFullYear()} AnyProg. Not affiliated with Anytone.
        </div>
      </div>
    </footer>
  );
}
