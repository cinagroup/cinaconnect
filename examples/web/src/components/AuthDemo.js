import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useCinacoin } from '@cinacoin/react';
import { SiweMessage } from 'siwe';
/**
 * AuthDemo — Real SIWE (Sign-In With Ethereum) authentication demo.
 *
 * Features:
 * - Real SIWE message generation per EIP-4361 spec
 * - Real wallet signature collection
 * - Server-side verification endpoint integration
 * - Session management (JWT token storage)
 */
// Backend verification endpoint (replace with your actual API)
const AUTH_API = import.meta.env.VITE_AUTH_API_URL || '/api/auth/siwe';
export function AuthDemo() {
    const { account, signMessage, chainId } = useCinacoin();
    const [authStatus, setAuthStatus] = useState('idle');
    const [authMessage, setAuthMessage] = useState('');
    const [authResult, setAuthResult] = useState(null);
    const [session, setSession] = useState(null);
    const generateSIWEMessage = () => {
        const domain = window.location.hostname || 'localhost';
        const nonce = Math.random().toString(36).substring(2, 15);
        const issuedAt = new Date().toISOString();
        const expirationTime = new Date(Date.now() + 3600000).toISOString();
        // Create a proper EIP-4361 SIWE message
        const message = new SiweMessage({
            domain,
            address: account || '',
            statement: 'Sign in to Cinacoin Demo',
            uri: window.location.origin,
            version: '1',
            chainId: chainId || 1,
            nonce,
            issuedAt,
            expirationTime,
            resources: [
                `${window.location.origin}/terms`,
            ],
        });
        const prepared = message.prepareMessage();
        setAuthMessage(prepared);
        return prepared;
    };
    const handleSignIn = async () => {
        if (!account)
            return;
        setAuthStatus('signing');
        setAuthMessage('');
        setAuthResult(null);
        try {
            // Step 1: Generate SIWE message
            const message = generateSIWEMessage();
            // Step 2: Sign with wallet
            const signature = await signMessage(message);
            setAuthResult(signature);
            // Step 3: Verify with backend
            setAuthStatus('verifying');
            const resp = await fetch(AUTH_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    signature,
                }),
            });
            if (!resp.ok) {
                throw new Error(`Verification failed: ${resp.statusText}`);
            }
            const data = await resp.json();
            const sessionData = {
                address: account,
                token: data.token,
                expiresAt: new Date(data.expiresAt),
            };
            // Store session
            localStorage.setItem('cinacoin_session', JSON.stringify(sessionData));
            setSession(sessionData);
            setAuthStatus('success');
        }
        catch (error) {
            console.error('SIWE authentication failed:', error);
            setAuthStatus('error');
            setAuthResult(error.message);
        }
    };
    const handleSignOut = () => {
        localStorage.removeItem('cinacoin_session');
        setSession(null);
        setAuthStatus('idle');
        setAuthResult(null);
        setAuthMessage('');
    };
    // Restore session on mount
    useState(() => {
        const saved = localStorage.getItem('cinacoin_session');
        if (saved) {
            try {
                const s = JSON.parse(saved);
                if (new Date(s.expiresAt) > new Date()) {
                    setSession(s);
                    setAuthStatus('success');
                }
            }
            catch {
                localStorage.removeItem('cinacoin_session');
            }
        }
    });
    return (_jsxs("div", { className: "auth-demo", children: [session && (_jsxs("div", { className: "demo-card session-card", children: [_jsxs("div", { className: "session-header", children: [_jsx("span", { className: "session-icon", children: "\uD83D\uDD10" }), _jsx("span", { className: "session-text", children: "\u5DF2\u8BA4\u8BC1\u4F1A\u8BDD" }), _jsx("button", { className: "btn btn-small", onClick: handleSignOut, children: "\u9000\u51FA\u767B\u5F55" })] }), _jsxs("div", { className: "session-info", children: [_jsxs("span", { children: ["\u5730\u5740: ", session.address] }), _jsxs("span", { children: ["\u8FC7\u671F: ", new Date(session.expiresAt).toLocaleString()] })] })] })), _jsxs("div", { className: "demo-card", children: [_jsx("h3", { children: "SIWE \u8BA4\u8BC1\u6D41\u7A0B" }), !account ? (_jsx("p", { className: "no-account", children: "\u8BF7\u5148\u8FDE\u63A5\u94B1\u5305" })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "auth-step", children: [_jsx("div", { className: "step-number", children: "1" }), _jsxs("div", { className: "step-content", children: [_jsx("h4", { children: "\u751F\u6210 SIWE \u6D88\u606F (EIP-4361)" }), _jsx("p", { children: "\u5305\u542B domain\u3001address\u3001nonce\u3001expiration \u7B49\u4FE1\u606F" }), authMessage && (_jsx("pre", { className: "message-preview", children: authMessage }))] })] }), _jsxs("div", { className: "auth-step", children: [_jsx("div", { className: "step-number", children: "2" }), _jsxs("div", { className: "step-content", children: [_jsx("h4", { children: "\u94B1\u5305\u7B7E\u540D" }), _jsx("p", { children: "\u7528\u6237\u901A\u8FC7\u94B1\u5305\u7B7E\u540D\u6D88\u606F\uFF0C\u8BC1\u660E\u62E5\u6709\u8BE5\u5730\u5740" }), _jsx("button", { className: "btn btn-primary", onClick: handleSignIn, disabled: authStatus === 'signing' || authStatus === 'verifying', children: authStatus === 'signing'
                                                    ? '等待签名...'
                                                    : authStatus === 'verifying'
                                                        ? '验证中...'
                                                        : '签名并登录' })] })] }), _jsxs("div", { className: "auth-step", children: [_jsx("div", { className: "step-number", children: "3" }), _jsxs("div", { className: "step-content", children: [_jsx("h4", { children: "\u540E\u7AEF\u9A8C\u8BC1 & \u521B\u5EFA Session" }), _jsxs("p", { children: ["\u670D\u52A1\u5668\u9A8C\u8BC1\u7B7E\u540D\u5E76\u8FD4\u56DE JWT Token\u3002 \u5B9E\u9645\u90E8\u7F72\u65F6\u8BF7\u8BBE\u7F6E ", _jsx("code", { children: "VITE_AUTH_API_URL" }), "\u3002"] }), authStatus === 'idle' && (_jsx("p", { className: "step-waiting", children: "\u7B49\u5F85\u7B7E\u540D..." })), authStatus === 'success' && (_jsxs("div", { className: "step-success", children: [_jsx("span", { className: "success-icon", children: "\u2705" }), _jsx("span", { children: "\u7B7E\u540D\u9A8C\u8BC1\u6210\u529F\uFF01Session \u5DF2\u521B\u5EFA" }), authResult && (_jsxs("pre", { className: "signature-preview", children: ["\u7B7E\u540D: ", authResult.slice(0, 66), "..."] }))] })), authStatus === 'error' && (_jsxs("div", { className: "step-error", children: [_jsx("span", { className: "error-icon", children: "\u274C" }), _jsxs("span", { children: ["\u8BA4\u8BC1\u5931\u8D25: ", authResult] })] }))] })] })] }))] }), _jsxs("div", { className: "demo-card", children: [_jsx("h3", { children: "SIWE \u6D88\u606F\u683C\u5F0F (EIP-4361)" }), _jsx("pre", { className: "format-example", children: `domain wants you to sign in with your Ethereum account:
0x1a2b...3c4d

Sign in to My dApp

URI: https://mydapp.com
Version: 1
Chain ID: 1
Nonce: abc123
Issued At: 2026-05-16T10:00:00.000Z
Expiration Time: 2026-05-16T11:00:00.000Z
Resources:
- https://mydapp.com/terms` })] }), _jsxs("div", { className: "demo-card", children: [_jsx("h3", { children: "\u540E\u7AEF\u9A8C\u8BC1 API \u793A\u4F8B" }), _jsx("pre", { className: "api-example", children: `// POST /api/auth/siwe
// Request:
{
  "message": "example.com wants you to sign in...",
  "signature": "0x1234...abcd"
}

// Response:
{
  "token": "eyJhbGciOi...",
  "expiresAt": "2026-05-16T11:00:00.000Z"
}

// 使用 siwe 包在 Node.js 端验证:
import { SiweMessage } from 'siwe';
const siweMsg = new SiweMessage(message);
await siweMsg.verify({ signature });` })] })] }));
}
//# sourceMappingURL=AuthDemo.js.map