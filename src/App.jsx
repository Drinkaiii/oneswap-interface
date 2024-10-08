import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainContent from './MainContent';
import AppFooter from './Footer';
import AppHeader from './Header';
import LandingPage from './LandingPage';
import { TokenProvider } from './TokenProvider';
import { WebSocketProvider } from './WebSocketProvider';
import WalletProvider from './WalletProvider';
import './App.css';

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/*"
            element={
              <WebSocketProvider>
                <WalletProvider>
                  <TokenProvider>
                    <AppHeader />
                    <main className="Content"> 
                      <MainContent />
                    </main>
                    <AppFooter />
                  </TokenProvider>
                </WalletProvider>
              </WebSocketProvider>
            }
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
