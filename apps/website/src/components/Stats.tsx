export default function Stats() {
  const stats = [
    { value: '100M+', label: 'Wallet Connections' },
    { value: '50+', label: 'Chains Supported' },
    { value: '10K+', label: 'Apps Built' },
    { value: '99.99%', label: 'Uptime' },
  ];

  return (
    <section className="relative py-20">
      {/* Subtle divider */}
      <div className="mx-auto mb-16 h-px w-full max-w-7xl bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
        {stats.map((stat, i) => (
          <div key={i} className="text-center">
            <div className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl">
              {stat.value}
            </div>
            <div className="mt-2 text-sm text-zinc-500">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
