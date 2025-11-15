import React from 'react';
import './Home.css';

function Home() {
  return (
    <div className="home-container">
      <header className="header">
        <h1>Palletize App</h1>
        <p>Calculate optimal pallet configurations</p>
      </header>
      
      <main className="main-content">
        <div className="welcome-section">
          <h2>Welcome!</h2>
          <p>This app helps you calculate the best way to stack products on pallets.</p>
          
          <div className="features">
            <div className="feature-card">
              <h3>📦 Upload Excel</h3>
              <p>Import product dimensions from Excel files</p>
            </div>
            
            <div className="feature-card">
              <h3>📊 Calculate</h3>
              <p>Get optimal pallet configurations</p>
            </div>
            
            <div className="feature-card">
              <h3>📋 View Results</h3>
              <p>See detailed packing arrangements</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
