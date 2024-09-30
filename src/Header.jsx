// Header.js
import React, { useContext, useEffect } from 'react';
import { Layout, Menu, Button, notification } from 'antd';
import { Link } from 'react-router-dom';
import { WalletContext } from './WalletProvider';

const { Header } = Layout;

const AppHeader = () => {
  const { account, connectWallet, errorMessage } = useContext(WalletContext);

  useEffect(() => {
    if (errorMessage) {
      notification.error({
        message: 'Connect Failed',
        description: errorMessage,
        placement: 'topRight',
      });
    }
  }, [errorMessage]);

  const menuItems = [
    { key: '1', label: <Link to="/swap">Swap</Link> },
    { key: '2', label: <Link to="/limit">Limit Order</Link> },
    { key: '3', label: <Link to="/settings">Settings</Link> },
  ];

  return (
    <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Menu theme="dark" mode="horizontal" defaultSelectedKeys={['1']} items={menuItems} />
      <div>
        {account ? (
          <span style={{ color: 'white', marginRight: '16px' }}>{`Connected: ${account}`}</span>
        ) : (
          <Button type="primary" onClick={connectWallet}>
            Connect Wallet
          </Button>
        )}
      </div>
    </Header>
  );
};

export default AppHeader;
