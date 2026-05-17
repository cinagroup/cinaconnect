import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
const WALLETS = [
    { id: 'metamask', name: 'MetaMask', emoji: '🦊', color: '#F6851B', popular: true, detected: true },
    { id: 'walletconnect', name: 'WalletConnect', emoji: '🔗', color: '#3B99FC', popular: true, qr: true },
    { id: 'coinbase', name: 'Coinbase Wallet', emoji: '🔵', color: '#0052FF', popular: true, detected: true },
    { id: 'rainbow', name: 'Rainbow', emoji: '🌈', color: '#8B5CF6', popular: true },
    { id: 'phantom', name: 'Phantom', emoji: '👻', color: '#AB9FF2', popular: true },
    { id: 'trust', name: 'Trust Wallet', emoji: '🛡️', color: '#3375BB', popular: true },
    { id: 'ledger', name: 'Ledger', emoji: '🔒', color: '#000000', popular: false },
    { id: 'zerion', name: 'Zerion', emoji: '💜', color: '#2C60F5', popular: false },
];
const WalletModal = ({ isOpen, onClose, onConnect }) => {
    const [modalState, setModalState] = useState(isOpen ? 'open' : 'closed');
    const [selectedWallet, setSelectedWallet] = useState(null);
    const [progress, setProgress] = useState(0);
    const [activeTab, setActiveTab] = useState('popular');
    useEffect(() => {
        if (isOpen) {
            setModalState('open');
            setSelectedWallet(null);
            setProgress(0);
        }
    }, [isOpen]);
    useEffect(() => {
        if (modalState === 'connecting') {
            setProgress(0);
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setModalState('success');
                        return 100;
                    }
                    return prev + Math.random() * 15 + 5;
                });
            }, 200);
            return () => clearInterval(interval);
        }
    }, [modalState]);
    const handleSelectWallet = useCallback((wallet) => {
        setSelectedWallet(wallet);
        setModalState('connecting');
        if (onConnect) {
            setTimeout(() => onConnect(wallet.id), 2000);
        }
    }, [onConnect]);
    const handleClose = useCallback(() => {
        setModalState('closed');
        setSelectedWallet(null);
        setProgress(0);
        onClose();
    }, [onClose]);
    const handleBack = useCallback(() => {
        setModalState('open');
        setSelectedWallet(null);
        setProgress(0);
    }, []);
    if (modalState === 'closed')
        return null;
    const popularWallets = WALLETS.filter(w => w.popular);
    const allWallets = WALLETS.filter(w => !w.popular);
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center", role: "dialog", "aria-modal": "true", children: [_jsx("div", { className: "absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in", onClick: modalState === 'open' ? handleClose : undefined }), _jsx("div", { className: "relative z-10 w-full max-w-md mx-4 animate-bounce-in", children: _jsxs("div", { className: "glass-card rounded-2xl overflow-hidden shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-white/10", children: [_jsxs("div", { className: "flex items-center gap-3", children: [modalState !== 'open' && (_jsx("button", { onClick: modalState === 'success' ? handleClose : handleBack, className: "p-1 rounded-lg hover:bg-white/10 transition-colors", children: _jsx("svg", { className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 19l-7-7 7-7" }) }) })), _jsx("h2", { className: "text-lg font-semibold", children: modalState === 'connecting' ? 'Connecting...' :
                                                modalState === 'success' ? 'Connected' : 'Connect Wallet' })] }), _jsx("button", { onClick: handleClose, className: "p-2 rounded-lg hover:bg-white/10 transition-colors", children: _jsx("svg", { className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }), _jsxs("div", { className: "max-h-[60vh] overflow-y-auto", children: [modalState === 'open' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex px-6 pt-4 gap-2", children: [_jsx("button", { onClick: () => setActiveTab('popular'), className: `px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'popular'
                                                        ? 'bg-violet-600/20 text-violet-400'
                                                        : 'text-gray-400 hover:text-white'}`, children: "Popular" }), _jsx("button", { onClick: () => setActiveTab('all'), className: `px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'all'
                                                        ? 'bg-violet-600/20 text-violet-400'
                                                        : 'text-gray-400 hover:text-white'}`, children: "All wallets" })] }), _jsxs("div", { className: "px-6 pb-6 pt-2", children: [activeTab === 'popular' && (_jsx("div", { className: "space-y-2", children: popularWallets.map((wallet, i) => (_jsxs("button", { onClick: () => handleSelectWallet(wallet), className: "w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-all group", style: { animationDelay: `${i * 0.05}s` }, children: [_jsx("div", { className: "w-10 h-10 rounded-xl flex items-center justify-center text-xl", style: { backgroundColor: wallet.color + '20' }, children: wallet.emoji }), _jsx("span", { className: "flex-1 text-left font-medium", children: wallet.name }), wallet.detected && (_jsx("span", { className: "text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400", children: "Detected" })), wallet.qr && (_jsx("svg", { className: "w-5 h-5 text-gray-500 group-hover:text-gray-300", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" }) })), _jsx("svg", { className: "w-5 h-5 text-gray-600 group-hover:text-gray-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" }) })] }, wallet.id))) })), activeTab === 'all' && (_jsx("div", { className: "space-y-2", children: allWallets.map((wallet, i) => (_jsxs("button", { onClick: () => handleSelectWallet(wallet), className: "w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-all group", style: { animationDelay: `${i * 0.05}s` }, children: [_jsx("div", { className: "w-10 h-10 rounded-xl flex items-center justify-center text-xl", style: { backgroundColor: wallet.color + '20' }, children: wallet.emoji }), _jsx("span", { className: "flex-1 text-left font-medium", children: wallet.name }), _jsx("svg", { className: "w-5 h-5 text-gray-600 group-hover:text-gray-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" }) })] }, wallet.id))) }))] })] })), modalState === 'connecting' && selectedWallet && (_jsxs("div", { className: "flex flex-col items-center justify-center py-12 px-6", children: [_jsxs("div", { className: "relative mb-6", children: [_jsx("div", { className: "w-20 h-20 rounded-full border-2 border-white/10" }), _jsx("div", { className: "absolute inset-0 w-20 h-20 rounded-full border-2 border-transparent border-t-violet-500 animate-spin-slow" }), _jsx("div", { className: "absolute inset-2 w-16 h-16 rounded-xl flex items-center justify-center text-2xl", style: { backgroundColor: selectedWallet.color + '20' }, children: selectedWallet.emoji })] }), _jsxs("p", { className: "text-gray-400 text-sm mb-4", children: ["Opening ", selectedWallet.name, "..."] }), _jsx("div", { className: "w-full h-1.5 bg-white/10 rounded-full overflow-hidden", children: _jsx("div", { className: "h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-200", style: { width: `${Math.min(progress, 100)}%` } }) }), _jsx("p", { className: "text-gray-500 text-xs mt-3", children: "Confirm connection in your wallet" })] })), modalState === 'success' && selectedWallet && (_jsxs("div", { className: "flex flex-col items-center justify-center py-12 px-6", children: [_jsx("div", { className: "w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 animate-bounce-in", children: _jsx("svg", { className: "w-10 h-10 text-emerald-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2.5, d: "M5 13l4 4L19 7" }) }) }), _jsx("h3", { className: "text-xl font-semibold mb-2", children: "Wallet Connected" }), _jsxs("p", { className: "text-gray-400 text-sm mb-2", children: ["Connected via ", selectedWallet.name] }), _jsxs("div", { className: "flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-sm text-gray-300 font-mono", children: [_jsx("span", { children: "0x7a3...8f2d" }), _jsx("svg", { className: "w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-300", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" }) })] })] }))] }), modalState === 'open' && (_jsxs("div", { className: "px-6 py-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-500", children: [_jsx("span", { children: "New to wallets?" }), _jsx("a", { href: "#", className: "text-violet-400 hover:text-violet-300 hover:underline", children: "Learn more \u2192" })] }))] }) })] }));
};
export default WalletModal;
//# sourceMappingURL=WalletModal.js.map