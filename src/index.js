// index.js
// Reactアプリのエントリーポイント
// leafletやbootstrap、index.cssを読み込み、Appコンポーネントを描画
// 最終的なUI全体を表示。

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'leaflet/dist/leaflet.css';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
