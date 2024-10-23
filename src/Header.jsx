import React, { useContext, useEffect, useState, useRef } from 'react';
import { Layout, Menu, Button, Modal, notification, Space, Typography, Tooltip, Spin, Drawer } from 'antd';
import { CopyOutlined, LoadingOutlined, GlobalOutlined, MenuOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import { WalletContext } from './WalletProvider';
import { useWebSocket } from './WebSocketProvider';
import Web3 from 'web3';

const { Header } = Layout;
const { Paragraph } = Typography;

const AppHeader = () => {

  const location = useLocation();
  const [selectedKey, setSelectedKey] = useState(getSelectedKey(location.pathname));

  const { account, connectWallet, disconnectWallet, switchWallet, errorMessage } = useContext(WalletContext);
  const { gasPrice } = useWebSocket();
  const [formattedGasPrice, setFormattedGasPrice] = useState();
  const [gasPriceColor, setGasPriceColor] = useState('green');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const walletButtonRef = useRef(null);
  const [isWaitingForTransaction, setIsWaitingForTransaction] = useState(false);

  // RWD
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
  const [drawerVisible, setDrawerVisible] = useState(false);
  
  
  useEffect(() => {
    setSelectedKey(getSelectedKey(location.pathname));
  }, [location]);

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

  useEffect(() => {
    if (gasPrice) {
      const formattedPrice = formatGasPrice(gasPrice);
      setFormattedGasPrice(formattedPrice);
      
      const numericPrice = parseFloat(formattedPrice);
      if (numericPrice < 30) {
        setGasPriceColor('green');
      } else if (numericPrice >= 30 && numericPrice <= 70) {
        setGasPriceColor('yellow');
      } else {
        setGasPriceColor('red');
      }
    } else {
      setFormattedGasPrice(undefined);
    }
  }, [gasPrice]);

  // RWD
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const menuItems = [
    { key: '1', label: <Link to="/swap">Swap</Link> },
    { key: '2', label: <Link to="/limit">Limit</Link> },
    { key: '3', label: <Link to="/readMe">ReadMe</Link> },
  ];

  // for select key initialization
  function getSelectedKey(pathname){
    if (pathname.includes('/swap')) return '1';
    if (pathname.includes('/limit')) return '2';
    if (pathname.includes('/readMe')) return '3';
    return '1'; // default is Swap page
  };

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

  const formatGasPrice = (price) => {
    if (!price) return;
    const web3 = new Web3();
    const gweiPrice = web3.utils.fromWei(price.toString(), 'gwei');
    return parseFloat(gweiPrice).toFixed(2);
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
                  icon={<GlobalOutlined />}
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
      {isMobileView ? (
        <>
          <Button
            className="drawer-menu-button"
            type="primary"
            icon={<MenuOutlined />}
            onClick={() => setDrawerVisible(true)}
          />
          <Drawer
            title="OneSwap"
            placement="left"
            onClose={() => setDrawerVisible(false)}
            open={drawerVisible}
          >
            <Menu 
              className="drawer-menu" 
              mode="vertical" 
              selectedKeys={[selectedKey]}
              items={menuItems}
              onClick={() => setDrawerVisible(false)}
            />
          </Drawer>
        </>
      ) : (
        <Menu 
          className="app-menu" 
          theme="dark" 
          mode="horizontal" 
          selectedKeys={[selectedKey]}
          items={menuItems}
        />
      )}
      <div className="header-right">
        {!isMobileView && formattedGasPrice && (
          <div className="gas-price">
            <span className={`gas-price-indicator ${gasPriceColor}`}></span>
            <span className="gas-price-text">{formattedGasPrice} Gwei</span>
          </div>
        )}
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
            <Button className="waiting-close-button" type="text" onClick={() => setIsWaitingForTransaction(false)}>
              Close
            </Button>
          </div>
        }
        closable={false}
        centered
        className="waiting-modal"
      >
        <div className="waiting-modal-content">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 70, color: 'var(--green)' }} spin />} />
          <p>Please confirm the connection in your wallet...</p>
        </div>
      </Modal>
    </Header>
  );
};

export default AppHeader;