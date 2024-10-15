import React, { useEffect } from 'react';
import { Layout } from 'antd';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Swap from './SwapComponent';
import LimitOrder from './LimitOrderComponent';
import Setting from './SettingComponent';
import { AdvancedSettingsProvider } from './AdvancedSettings';

const { Content } = Layout;

const MainContent = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
  return (
    <Content>
      <div style={{ background: '#fff', padding: 24, minHeight: 380, display:"flex", justifyContent:"center" }}>
        <AdvancedSettingsProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/swap" />} />
            <Route path="/swap" element={<Swap />} />
            <Route path="/limit" element={<LimitOrder />} />
            <Route path="/settings" element={<Setting />} />
            <Route path="*" element={<div>Page not found</div>} />
          </Routes>
        </AdvancedSettingsProvider>
      </div>
    </Content>
  );
};

export default MainContent;
