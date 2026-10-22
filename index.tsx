
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Impede que girar a rodinha do mouse (scroll wheel) altere acidentalmente os valores de campos numéricos focados
if (typeof window !== 'undefined') {
  window.addEventListener(
    'wheel',
    () => {
      if (
        document.activeElement instanceof HTMLInputElement &&
        document.activeElement.type === 'number'
      ) {
        document.activeElement.blur();
      }
    },
    { passive: true }
  );
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
