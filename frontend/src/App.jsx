import React from 'react';
import './index.css';

function App() {
  return (
    <div className="min-h-screen">
      <header className="header">
        <div className="container">
          <div className="flex items-center justify-between py-4">
            <h1 className="text-2xl font-bold text-gradient">MonadSocial</h1>
            <nav className="flex space-x-6">
              <a href="#" className="nav-link active">Feed</a>
              <a href="#" className="nav-link">Polls</a>
            </nav>
          </div>
        </div>
      </header>
      <main className="container py-8">
        <div className="card">
          <h2 className="text-lg text-monad-light">Welcome to MonadSocial!</h2>
          <p className="text-gray-400">Your decentralized social network on Monad blockchain.</p>
        </div>
      </main>
    </div>
  );
}

export default App;