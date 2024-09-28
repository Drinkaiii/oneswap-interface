import React from 'react';
import { Layout } from 'antd';
import { Routes, Route, Navigate } from 'react-router-dom';
import Swap from './SwapComponent';
import LimitOrder from './LimitOrderComponent';
import Setting from './SettingComponent';

const { Content } = Layout;

const MainContent = () => {
  return (
    <Content style={{ padding: '0 50px', marginTop: 64 }}>
      <div style={{ background: '#fff', padding: 24, minHeight: 380, display:"flex", justifyContent:"center" }}>
        <Routes>
          <Route path="/" element={<Navigate to="/swap" />} />
          <Route path="/swap" element={<Swap />} />
          <Route path="/limit" element={<LimitOrder />} />
          <Route path="/settings" element={<Setting />} />
          <Route path="*" element={<div>Page not found</div>} />
        </Routes>
      </div>
    </Content>
  );
};

export default MainContent;
