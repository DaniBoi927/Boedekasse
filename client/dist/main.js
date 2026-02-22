import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import ErrorBoundary from './ErrorBoundary';
const root = document.getElementById('root');
if (root)
    createRoot(root).render(_jsx(React.StrictMode, { children: _jsx(ErrorBoundary, { children: _jsx(App, {}) }) }));
 