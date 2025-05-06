import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import TradingSignal from './TradingSignal';
import { registerServiceWorker } from './registerSW';

// Register the service worker for PWA functionality
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TradingSignal />
  </React.StrictMode>
);
