import React, { useState, useEffect } from 'react';
import { Button, Input, Modal, List, Typography, Card } from 'antd';
import { SwapOutlined } from '@ant-design/icons';

const { Text } = Typography;

const availableTokens = [
  { symbol: 'ETH', balance: 0.0719 },
  { symbol: 'USDT', balance: 110.5 },
  { symbol: 'DAI', balance: 300.0 },
  { symbol: 'BTC', balance: 0.01 },
];

const SwapComponent = () => {
  const [sellToken, setSellToken] = useState('ETH');
  const [buyToken, setBuyToken] = useState('USDT');
  const [sellAmount, setSellAmount] = useState(0.05);
  const [buyAmount, setBuyAmount] = useState(114.214957349573597312);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSelectingSell, setIsSelectingSell] = useState(true);
  const [tokenIcons, setTokenIcons] = useState({});

  useEffect(() => {
    // Fetch token icons from CoinGecko
    const fetchTokenIcons = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=ethereum,bitcoin,tether,dai'
        );
        const data = await response.json();
        const icons = {};
        data.forEach(token => {
          icons[token.symbol.toUpperCase()] = token.image;
        });
        setTokenIcons(icons);
      } catch (error) {
        console.error('Error fetching token icons:', error);
      }
    };

    fetchTokenIcons();
  }, []);

  const showTokenSelection = (isSell) => {
    setIsSelectingSell(isSell);
    setIsModalVisible(true);
  };

  const handleTokenSelect = (token) => {
    if (isSelectingSell) {
      setSellToken(token.symbol);
    } else {
      setBuyToken(token.symbol);
    }
    setIsModalVisible(false);
  };

  const handleSwap = () => {
    // todo swap token logic
    console.log('Swap transaction initiated');
  };

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '20px', width: '400px', backgroundColor: '#f0f2f5' }}>
      
      {/* sell token area */}
      <Card style={{ marginBottom: '20px', borderRadius: '8px' }}>
      <Text type="secondary">Sell</Text>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Input
          value={sellAmount}
          onChange={(e) => setSellAmount(e.target.value)}
          style={{ 
            fontSize: '30px',
            paddingLeft: "0px",
            border: 'none',
            boxShadow: 'none',
            outline: 'none'
          }}
          
        />
        <Button 
          onClick={() => showTokenSelection(true)} 
          style={{ 
            fontSize: '20px',
            padding: '0 12px', 
            height: '100%',  
            display: 'flex', 
            alignItems: 'center',  
            backgroundColor: 'white',  
            color: 'black'  
          }}
        >
          {tokenIcons[sellToken] && (
            <img 
              src={tokenIcons[sellToken]} 
              alt={sellToken} 
              style={{ width: '20px', marginRight: '8px' }} 
            />
          )}
          {sellToken}
        </Button>
      </div>
        <Text type="secondary">Balance: {availableTokens.find(token => token.symbol === sellToken)?.balance}</Text>
      </Card>

      {/* buy token area */}
      <Card style={{ marginBottom: '20px', borderRadius: '8px' }}>
      <Text type="secondary">Buy</Text>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Input
          value={buyAmount}
          onChange={(e) => setBuyAmount(e.target.value)}
          style={{ 
            fontSize: '30px',
            paddingLeft: "0px",
            border: 'none',
            boxShadow: 'none',
            outline: 'none'
          }}
          
        />
        <Button 
          onClick={() => showTokenSelection(true)} 
          style={{ 
            fontSize: '20px',
            padding: '0 12px', 
            height: '100%',  
            display: 'flex', 
            alignItems: 'center',  
            backgroundColor: 'white',  
            color: 'black'  
          }}
        >
          {tokenIcons[buyToken] && (
            <img 
              src={tokenIcons[buyToken]} 
              alt={buyToken} 
              style={{ width: '20px', marginRight: '8px' }} 
            />
          )}
          {buyToken}
        </Button>
      </div>
        <Text type="secondary">Balance: {availableTokens.find(token => token.symbol === buyToken)?.balance}</Text>
      </Card>

      <Button type="primary" block onClick={handleSwap} icon={<SwapOutlined />}>
        Swap
      </Button>

      <Modal
        title="Select a token"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <List
          dataSource={availableTokens}
          renderItem={(item) => (
            <List.Item onClick={() => handleTokenSelect(item)}>
              {/* show toekn icons and name */}
              {tokenIcons[item.symbol] && <img src={tokenIcons[item.symbol]} alt={item.symbol} style={{ width: '20px', marginRight: '8px' }} />}
              <Text>{item.symbol}</Text> 
              <Text type="secondary">Balance: {item.balance}</Text>
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default SwapComponent;





