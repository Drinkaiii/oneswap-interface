import React, { useContext, useEffect, useState, useRef } from 'react';
import { Layout, Menu, Button, Modal, notification, Space, Typography, Tooltip, Spin } from 'antd';
import { CopyOutlined, LoadingOutlined, LinkOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { WalletContext } from './WalletProvider';

const { Header } = Layout;
const { Paragraph } = Typography;

const AppHeader = () => {
  const { account, connectWallet, disconnectWallet, switchWallet, errorMessage } = useContext(WalletContext);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const walletButtonRef = useRef(null);
  const [isWaitingForTransaction, setIsWaitingForTransaction] = useState(false);

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

  const handleConnect = async () => {
    setIsModalVisible(false);
    setIsWaitingForTransaction(true);
    await connectWallet();
    setIsWaitingForTransaction(false);
  }

  const handleDisconnect = () => {
    disconnectWallet();
    setIsModalVisible(false);
  };

  const handleSwitchWallet = async () => {
    setIsModalVisible(false);
    setIsWaitingForTransaction(true);
    await switchWallet();
    setIsWaitingForTransaction(false);
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
            onClick={handleConnect}
          >
            Connect Wallet
          </Button>
        )}
      </div>
      {/* Waiting Modal */}
      <Modal
        title={
          <div className="waiting-modal-title">
            Waiting for Connect Wallet
          </div>
        }
        open={isWaitingForTransaction}
        footer={
          <div className="waiting-modal-footer">
            <Button type="text" onClick={() => setIsWaitingForTransaction(false)}>
              Close Window
            </Button>
          </div>
        }
        closable={false}
        centered
        className="waiting-modal"
      >
        <div className="waiting-modal-content">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 70 }} spin />} />
          <p>Please confirm the connection in your wallet...</p>
        </div>
      </Modal>
    </Header>
  );
};

export default AppHeader;