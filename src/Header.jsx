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
    { key: '2', label: <Link to="/limit">Limit</Link> },
    { key: '3', label: <Link to="/settings">Settings</Link> },
  ];

  return (
    <Header className="app-header">
      <Menu 
        className="app-menu" 
        theme="dark" 
        mode="horizontal" 
        defaultSelectedKeys={['1']} 
        items={menuItems}
      />
      <div className="wallet-connect">
        {account ? (
          <span className="wallet-address">{`Connected: ${account}`}</span>
        ) : (
          <Button className="connect-button" type="primary" onClick={connectWallet}>
            Connect Wallet
          </Button>
        )}
      </div>
    </Header>
  );
};

export default AppHeader;
