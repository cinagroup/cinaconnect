import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import ReactDOM from 'react-dom/client';
import HeadlessConnectButton from './components/HeadlessConnectButton';
import HeadlessAccountDisplay from './components/HeadlessAccountDisplay';
import HeadlessNetworkSelector from './components/HeadlessNetworkSelector';
function App() {
    return (_jsxs("div", { style: { maxWidth: 800, margin: '0 auto', padding: 40, fontFamily: 'system-ui' }, children: [_jsx("h1", { children: "Cinacoin Headless UI Examples" }), _jsx("p", { children: "Build your own UI using the headless SDK." }), _jsxs("section", { children: [_jsx("h2", { children: "Connect Button" }), _jsx(HeadlessConnectButton, {})] }), _jsxs("section", { children: [_jsx("h2", { children: "Account Display" }), _jsx(HeadlessAccountDisplay, {})] }), _jsxs("section", { children: [_jsx("h2", { children: "Network Selector" }), _jsx(HeadlessNetworkSelector, {})] })] }));
}
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(App, {}));
//# sourceMappingURL=main.js.map