import React, { useState, useEffect } from 'react';
import { Button, Input, Modal, List, Typography, Card } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import CountUp from 'react-countup';
import { useWebSocket } from './WebSocketProvider';
import BigNumber from 'bignumber.js';

const { Text } = Typography;

const availableTokens = [
  { symbol: 'ETH', decimals: 18, address: "0xa3127E9B960DA8E7b297411728Def559bCaDf9c4" },
  { symbol: 'USDT', decimals: 18, address: "0xdE43B354d506Ce213C4bE70B750b5c6AcC09D7CA"},
  { symbol: 'DAI', decimals: 18, address: "0x9a34950F069fFB4FD58bbE906f0C36A4c51AAf00" },
  { symbol: 'BTC', decimals: 18, address: "0xab0b42Ac6ec6B9B29E55Ba7991887f4C374d2407" }
];

const SwapComponent = () => {

  const [walletAddress, setWalletAddress] = useState("0x24aA3961304E5A9C1c65DEb666E766ae5b708177");
  const [walletTokens, setWalletTokens] = useState([]);

  const [sellToken, setSellToken] = useState(availableTokens[0]);// ETH
  const [buyToken, setBuyToken] = useState(availableTokens[1]);// BTC
  const [sellAmount, setSellAmount] = useState(new BigNumber("0"));
  const [buyAmount, setBuyAmount] = useState(new BigNumber("0"));
  const [effectAmount, setEffectAmount] = useState(sellAmount);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSelectingSell, setIsSelectingSell] = useState(true);
  const [tokenIcons, setTokenIcons] = useState({});

  const { client, connected, sessionId, estimateResponse } = useWebSocket(); // 拿到 WebSocket 的回應資料

  // fetch user and token data
  useEffect(() => {
    fetchTokenIcons();
    fetchAccount();
  }, []);

  // listen sellAmount change: if sellAmount change, resend the request
  useEffect(() => {
    if (sellAmount && sellAmount.gt(0) && client) {
      sendEstimateRequest(); 
    }
  }, [sellAmount]);

  // listen estimateResponse change and handle response
  useEffect(() => {
    if (estimateResponse) {
      handleEstimateResponse(estimateResponse);
    }
  }, [estimateResponse]);

  // Fetch token icons from CoinGecko
  async function fetchTokenIcons(){
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

  // Fetch user's wallet balance from Worker back-end
  async function fetchAccount(){
    // get user account
    fetch(`http://localhost:8080/api/1.0/account/info?address=${walletAddress}`)
      .then((response) => response.json())
      .then((data) => setWalletTokens(data))
      .catch((error) => console.error('Error fetching token balances:', error));
  }
  
  // send estimate request by WebSocket
  const sendEstimateRequest = () => {
    const estimateRequest = {
      tokenIn: "0xa3127e9b960da8e7b297411728def559bcadf9c4",
      tokenOut: "0xde43b354d506ce213c4be70b750b5c6acc09d7ca",
      amountIn: sellAmount.toFixed()
    };
    client.publish({
      destination: "/app/estimate",
      body: JSON.stringify(estimateRequest),
      headers: { sessionId },
    });
  };

  // handle response from WebSocket
  const handleEstimateResponse = (data) => {
    if (data.type === 'estimate' && data.status === 'success') {
      const estimateResponse = data.data[0];
      const decimalsOut = estimateResponse.liquidity.decimals1;
      setBuyAmount(new BigNumber(estimateResponse.amountOut));
    } else {
      console.error('無法獲取估算結果:', data);
    }
  };
  
  // token selection window
  const showTokenSelection = (isSell) => {
    setIsSelectingSell(isSell);
    setIsModalVisible(true);
  };

  // token selection button
  const handleTokenSelect = (token) => {
    if (isSelectingSell) {
      setSellToken(token);
    } else {
      setBuyToken(token);
    }
    setIsModalVisible(false);
  };

  // swap token function
  const handleSwap = () => {
    // TODO: Swap logic
    console.log('Swap transaction initiated');
  };

  // convert to normal unit
  function toNormaltUnit(amount, decimals) {
    if (amount === "")
      return ""
    const bigNumberAmount = BigNumber.isBigNumber(amount) ? amount : new BigNumber(amount);
    const factor = new BigNumber(10).pow(decimals);
    return Number(bigNumberAmount.div(factor).toPrecision(10));
  }

  // convert to the smallest unit
  function toSmallestUnit(amount, decimals) {
    const bigNumberAmount = BigNumber.isBigNumber(amount) ? amount : new BigNumber(amount);
    const factor = new BigNumber(10).pow(decimals);
    return bigNumberAmount.times(factor);
  }

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '20px', width: '400px', backgroundColor: '#f0f2f5' }}>
      {/* sell token area */}
      <Card style={{ marginBottom: '20px', borderRadius: '8px' }}>
        <Text type="secondary">Sell</Text>
        <div style={{ display: 'flex', alignItems: 'center' }}>
        <Input
          value={toNormaltUnit(sellAmount, 18)}
          onChange={(e) => {
            const inputValue = e.target.value;
            
            // if input us invalid, set sellAmount 0
            if (inputValue === "" || inputValue === '0' || isNaN(inputValue)) {
              setSellAmount("");
              setBuyAmount(new BigNumber(0));
              setEffectAmount(toNormaltUnit(sellAmount, 18));
            } else {
              setSellAmount(toSmallestUnit(inputValue, 18));
              setEffectAmount(toNormaltUnit(sellAmount, 18));
            }
          }}
          style={{ fontSize: '30px', paddingLeft: "0px", border: 'none', boxShadow: 'none', outline: 'none' }}
        />
          <Button 
            onClick={() => showTokenSelection(true)} 
            style={{ fontSize: '20px', padding: '0 12px', height: '100%', display: 'flex', alignItems: 'center', backgroundColor: 'white', color: 'black' }}
          >
            {tokenIcons[sellToken.symbol] && (
              <img 
                src={tokenIcons[sellToken.symbol]} 
                alt={sellToken.symbol} 
                style={{ width: '20px', marginRight: '8px' }} 
              />
            )}
            {sellToken.symbol}
          </Button>
        </div>
        <Text type="secondary">Balance: {availableTokens.find(token => token === sellToken)?.balance}</Text>
      </Card>

      {/* buy token area */}
      <Card style={{ marginBottom: '20px', borderRadius: '8px' }}>
        <Text type="secondary">Buy</Text>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: '30px', paddingLeft: "0px", flex: 1 }}>
            <CountUp 
              start={effectAmount}
              end={toNormaltUnit(buyAmount,18)}
              duration={1.2}
              decimals={5}
            />
          </div>

          <Button 
            onClick={() => showTokenSelection(false)} 
            style={{ fontSize: '20px', padding: '0 12px', display: 'flex', alignItems: 'center', backgroundColor: 'white', color: 'black', border: '1px solid #d9d9d9', borderRadius: '4px', marginLeft: '10px' }}
          >
            {tokenIcons[buyToken.symbol] && (
              <img 
                src={tokenIcons[buyToken.symbol]} 
                alt={buyToken.symbol} 
                style={{ width: '20px', marginRight: '8px' }} 
              />
            )}
            {buyToken.symbol}
          </Button>
        </div>
        <Text type="secondary">Balance: {availableTokens.find(token => token.symbol === buyToken.symbol)?.balance}</Text>
        {estimateResponse && (
            <div>
              <Text type="secondary">Best Exchange: {estimateResponse.data[0].liquidity.exchanger}</Text>
            </div>
          )}
      </Card>

      <Button type="primary" block onClick={handleSwap} icon={<SwapOutlined />}>
        Swap
      </Button>

      <Modal
        title="Select a token"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <List
          dataSource={availableTokens}
          renderItem={(item) => (
            <List.Item onClick={() => handleTokenSelect(item)}>
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