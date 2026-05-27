'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const NAV_ITEMS = [
    { href: '/', label: 'Home' },
    { href: '/swap', label: 'Swap' },
    { href: '/multi-chain', label: 'Multi-Chain' },
    { href: '/auth', label: 'Auth' },
];
export default function DemoLayout({ children }) {
    const pathname = usePathname();
    return (_jsxs("div", { className: "min-h-screen bg-gray-950 text-white", children: [_jsx("nav", { className: "border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50", children: _jsx("div", { className: "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "flex items-center justify-between h-16", children: [_jsx(Link, { href: "/", className: "text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent", children: "Cinacoin" }), _jsx("div", { className: "flex items-center gap-1", children: NAV_ITEMS.map((item) => (_jsx(Link, { href: item.href, className: `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === item.href
                                        ? 'bg-gray-800 text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`, children: item.label }, item.href))) })] }) }) }), _jsx("main", { className: "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12", children: children }), _jsx("footer", { className: "border-t border-gray-800 mt-auto", children: _jsx("div", { className: "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-500", children: "Cinacoin Demo \u2014 Self-hosted wallet connection toolkit" }) })] }));
}
//# sourceMappingURL=DemoLayout.js.map