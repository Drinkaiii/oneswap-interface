import React, { useContext, useEffect, useState, useRef } from 'react';
import { Layout, Menu, Button, Modal, notification, Space, Typography, Tooltip } from 'antd';
import { CopyOutlined, LinkOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { WalletContext } from './WalletProvider';

const { Header } = Layout;
const { Paragraph } = Typography;

const AppHeader = () => {
  const { account, connectWallet, disconnectWallet, switchWallet, errorMessage } = useContext(WalletContext);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const walletButtonRef = useRef(null);

  useEffect(() => {
    if (errorMessage) {
      notification.error({
        message: 'Wallet Operation Failed',
        description: errorMessage,
        placement: 'topRight',
      });
    }
  }, [errorMessage]);

  useEffect(() => {
    if (account && walletButtonRef.current) {
      walletButtonRef.current.blur();
    }
  }, [account]);

  const menuItems = [
    { key: '1', label: <Link to="/swap">Swap</Link> },
    { key: '2', label: <Link to="/limit">Limit</Link> },
  ];

  const shortenAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setIsModalVisible(false);
  };

  const handleSwitchWallet = async () => {
    await switchWallet();
    setIsModalVisible(false);
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(account);
    notification.success({
      message: 'Address Copied',
      description: 'The wallet address has been copied to your clipboard.',
      placement: 'topRight',
    });
  };

  const WalletModal = () => {
    const etherscanUrl = `https://etherscan.io/address/${account}`;

    return (
      <Modal
        title="Account Information"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        className="wallet-modal"
      >
        <div className="wallet-info">
          <Paragraph className="wallet-address">
            {account}
            <Space>
              <Tooltip title="Copy Address">
                <Button
                  icon={<CopyOutlined />}
                  onClick={handleCopyAddress}
                  type="text"
                  className="action-button"
                />
              </Tooltip>
              <Tooltip title="View on Etherscan">
                <Button
                  icon={<LinkOutlined />}
                  onClick={() => window.open(etherscanUrl, '_blank')}
                  type="text"
                  className="action-button"
                />
              </Tooltip>
            </Space>
          </Paragraph>
        </div>
        <Space>
          <Button className="switch-wallet-button" onClick={handleSwitchWallet}>
            Switch
          </Button>
          <Button className="disconnect-wallet-button" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </Space>
      </Modal>
    );
  };

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
          <>
            <Button 
              ref={walletButtonRef}
              className="wallet-address-button" 
              onClick={() => setIsModalVisible(true)}
              icon={<img src="/MetaMask_logo.svg" alt="MetaMask" className="metamask-logo" />}
            >
              {shortenAddress(account)}
            </Button>
            <WalletModal />
          </>
        ) : (
          <Button 
            className="connect-button" 
            type="primary" 
            onClick={connectWallet}
          >
            Connect Wallet
          </Button>
        )}
      </div>
    </Header>
  );
};

export default AppHeader;