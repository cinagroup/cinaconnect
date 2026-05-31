export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Cinacoin" className="h-8 w-8 rounded-lg" />
          <span className="text-lg font-semibold tracking-tight">Cinacoin</span>
        </a>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#products" className="text-sm text-zinc-400 transition-colors hover:text-white">Products</a>
          <a href="https://docs.cinacoin.com" className="text-sm text-zinc-400 transition-colors hover:text-white">Docs</a>
          <a href="https://github.com/cinagroup" className="text-sm text-zinc-400 transition-colors hover:text-white">GitHub</a>
        </div>
        <div className="flex items-center gap-3">
          <a href="https://dash.cinacoin.com" className="hidden text-sm text-zinc-400 transition-colors hover:text-white sm:block">
            Dashboard
          </a>
          <a href="#cta" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90">
            Get Started
          </a>
        </div>
      </div>
    </nav>
  )
}
