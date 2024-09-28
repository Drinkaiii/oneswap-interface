import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import MainContent from './MainContent';
import AppFooter from './Footer';
import Swap from './SwapComponent';
import LimitOrder from './LimitOrderComponent';
import Setting from './SettingComponent';
import AppHeader from './Header';
import { WebSocketProvider } from './WebSocketProvider';
import WalletProvider from './WalletProvider';
import './App.css';


function App() {
  return (
    <div className="App">
      <WebSocketProvider>
        <WalletProvider>
          <Router>
            <AppHeader />
            <main className="Content"> {/* 使用 main 包裹中間的內容 */}
              <MainContent />
            </main>
            <AppFooter /> {/* Footer 會自動排在最下方 */}
          </Router>
        </WalletProvider>
      </WebSocketProvider>
    </div>
  );
}


export default App;
