import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }
    static getDerivedStateFromError(error) {
        return { error };
    }
    componentDidCatch(error, info) {
        console.error('Unhandled error in React tree:', error, info);
    }
    render() {
        if (this.state.error) {
            return (_jsxs("div", { style: { padding: 24, fontFamily: 'Inter, Arial', color: '#111827' }, children: [_jsx("h2", { style: { color: '#b91c1c' }, children: "Something went wrong" }), _jsx("div", { style: { marginTop: 12 }, children: _jsx("pre", { style: { whiteSpace: 'pre-wrap' }, children: String(this.state.error && this.state.error.stack) }) }), _jsx("div", { style: { marginTop: 12 }, children: _jsx("button", { onClick: () => window.location.reload(), children: "Reload" }) })] }));
        }
        return this.props.children;
    }
}
