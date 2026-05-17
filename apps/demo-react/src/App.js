import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SwapPage from './pages/SwapPage';
import MultiChainPage from './pages/MultiChainPage';
import AuthPage from './pages/AuthPage';
function App() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(HomePage, {}) }), _jsx(Route, { path: "/swap", element: _jsx(SwapPage, {}) }), _jsx(Route, { path: "/multichain", element: _jsx(MultiChainPage, {}) }), _jsx(Route, { path: "/auth", element: _jsx(AuthPage, {}) })] }));
}
export default App;
//# sourceMappingURL=App.js.map