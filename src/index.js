// index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'leaflet/dist/leaflet.css'; // Leaflet CSS取り込み
import './index.css'; // 任意のCSS

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
