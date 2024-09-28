import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import MainContent from './MainContent';
import AppFooter from './Footer';
import Swap from './SwapComponent';
import LimitOrder from './LimitOrderComponent';
import Setting from './SettingComponent';
import AppHeader from './Header';
import { WebSocketProvider } from './WebSocketProvider';
import './App.css';


function App() {
  return (
    <div className="App">
      <WebSocketProvider>
        <Router>
          <AppHeader />
          <MainContent>
            <Swap />
            <LimitOrder />
            <Setting />
          </MainContent>
          <AppFooter />
        </Router>
      </WebSocketProvider>
    </div>
  );
}

export default App;
