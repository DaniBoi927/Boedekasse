import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAuth } from './AuthContext';
export default function LoginPage() {
    const { login, register } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLogin) {
                await login(email, password);
            }
            else {
                await register(email, password, name);
            }
        }
        catch (err) {
            setError(err.message || 'Der skete en fejl');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "login-page", children: _jsxs("div", { className: "login-container", children: [_jsxs("div", { className: "login-header", children: [_jsx("h1", { children: "\uD83C\uDFBE Padel B\u00F8dekasse" }), _jsx("p", { children: "Hold styr p\u00E5 b\u00F8derne \u2014 hvem skylder hvad p\u00E5 banen!" })] }), _jsxs("div", { className: "login-card", children: [_jsxs("div", { className: "login-tabs", children: [_jsx("button", { className: isLogin ? 'active' : '', onClick: () => setIsLogin(true), children: "Log ind" }), _jsx("button", { className: !isLogin ? 'active' : '', onClick: () => setIsLogin(false), children: "Opret konto" })] }), _jsxs("form", { onSubmit: handleSubmit, children: [!isLogin && (_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "name", children: "Navn" }), _jsx("input", { id: "name", type: "text", value: name, onChange: e => setName(e.target.value), placeholder: "Dit navn", required: !isLogin })] })), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "email", children: "Email" }), _jsx("input", { id: "email", type: "email", value: email, onChange: e => setEmail(e.target.value), placeholder: "din@email.dk", required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "password", children: "Password" }), _jsx("input", { id: "password", type: "password", value: password, onChange: e => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", required: true, minLength: 6 })] }), error && _jsx("div", { className: "error", children: error }), _jsx("button", { type: "submit", className: "primary", disabled: loading, children: loading ? 'Vent...' : (isLogin ? 'Log ind' : 'Opret konto') })] })] }), _jsxs("p", { className: "login-footer", children: [isLogin ? 'Har du ikke en konto?' : 'Har du allerede en konto?', ' ', _jsx("button", { className: "link", onClick: () => setIsLogin(!isLogin), children: isLogin ? 'Opret en her' : 'Log ind her' })] })] }) }));
}
