import Link from 'next/link';

interface FooterProps {
  brand?: string;
  copyrightYear?: number;
  links?: { label: string; href: string }[];
  githubUrl?: string;
}

const defaultLinks = [
  { label: 'Swap', href: '/swap' },
  { label: 'Multi-Chain', href: '/multi-chain' },
];

export default function Footer({
  brand = 'CinaCoin',
  copyrightYear = 2026,
  links = defaultLinks,
  githubUrl = 'https://github.com/cinaseek/cinacoin',
}: FooterProps) {
  return (
    <footer className="border-t border-gray-800 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            © {copyrightYear} {brand}. Open source under MIT License.
          </p>
          <div className="flex items-center gap-4">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <span className="text-xs text-gray-700">|</span>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
