// Main entry point for the React frontend
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Basic App component placeholder
const App: React.FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        <h1>WhatsApp Chat System</h1>
        <p>Real-time chat application</p>
      </header>
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

export default App;