import React, { useState, useEffect, useContext } from 'react';
import { Button, Input, Modal, List, Typography, Card, Slider, Spin, notification  } from 'antd';
import { SwapOutlined, LoadingOutlined, ArrowRightOutlined } from '@ant-design/icons';
import CountUp from 'react-countup';
import { useWebSocket } from './WebSocketProvider';
import { WalletContext } from './WalletProvider';
import BigNumber from 'bignumber.js';
import LimitOrderHistory  from './LimitOrderHistory';
import { fetchAccountBalances, fetchTokenIcons, toNormalUnit, toSmallestUnit } from './utils';


const { Text } = Typography;

const availableTokens = [
    { symbol: 'ETH', code: 'ethereum', decimals: 18, address: "0xa3127E9B960DA8E7b297411728Def559bCaDf9c4" },
    { symbol: 'WBTC', code: 'wrapped-bitcoin', decimals: 18, address: "0xdE43B354d506Ce213C4bE70B750b5c6AcC09D7CA"},
    { symbol: 'USDT', code: 'tether', decimals: 18, address: "0x9a34950F069fFB4FD58bbE906f0C36A4c51AAf00" },
    { symbol: 'ZYDB', code: 'zydb', decimals: 18, address: "0xab0b42Ac6ec6B9B29E55Ba7991887f4C374d2407" }
  ];

// Contract and ABI
const contractAddress = "0x08dfC836a3343618ffB412FFaDF3B882cB98852b"; // New Order Contract
const contractABI = [{"inputs":[{"internalType":"address","name":"_dexAggregator","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"user","type":"address"}],"name":"OrderCancelled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountOut","type":"uint256"}],"name":"OrderExecuted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"address","name":"tokenIn","type":"address"},{"indexed":false,"internalType":"address","name":"tokenOut","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountIn","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"minAmountOut","type":"uint256"}],"name":"OrderPlaced","type":"event"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"cancelOrder","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"dexAggregator","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"uint8","name":"exchange","type":"uint8"},{"internalType":"bytes32","name":"poolId","type":"bytes32"}],"name":"executeOrder","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"nextOrderId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"minAmountOut","type":"uint256"}],"name":"placeOrder","outputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"}];

const LimitOrderComponent = () => {

  const { web3, account, connectWallet, errorMessage } = useContext(WalletContext);
  const [balances, setBalances] = useState({});

  const [sellToken, setSellToken] = useState(availableTokens[0]);// default: ETH
  const [buyToken, setBuyToken] = useState(availableTokens[1]);// default: BTC
  const [sellAmount, setSellAmount] = useState(new BigNumber("0"));// default: 0
  const [buyAmount, setBuyAmount] = useState(new BigNumber("0"));// default: 0
  const [estimateAmount, setEstimateAmount] = useState(new BigNumber("0"));// default: 0
  const [effectAmount, setEffectAmount] = useState(sellAmount);

  const [slippage, setSlippage] = useState(1); // default: 1%
  const [minAmountOut, setMinAmountOut] = useState(new BigNumber("0")); // default: 0

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSelectingSell, setIsSelectingSell] = useState(true);
  const [tokenIcons, setTokenIcons] = useState({});
  // State for waiting modal
  const [isWaitingForTransaction, setIsWaitingForTransaction] = useState(false);

  const { client, connected, sessionId, estimateResponse } = useWebSocket();

  const [latestTransaction, setLatestTransaction] = useState(null);
  

  // fetch user and token data
  useEffect(() => {
    fetchTokenIcons(availableTokens, setTokenIcons);
  }, []);

  // Fetch user's wallet balance from Worker back-end
  useEffect(() => {
    if (account)
      fetchAccountBalances(account, setBalances); // fetch account info again if account change
    else
      console.log("No wallet connected");
  }, [account]);

  // listen sellAmount change: if sellAmount change, resend the request
  useEffect(() => {
    if (sellAmount && sellAmount.gt(0) && client) {
      sendEstimateRequest(); 
    }
  }, [sellAmount,sellToken,buyToken]);

  // listen estimateResponse change and handle response
  useEffect(() => {
    if (estimateResponse) {
      handleEstimateResponse(estimateResponse);
    }
  }, [estimateResponse]);

  // listen slippage and caculate minAmountOut
  useEffect(() => {
    if (estimateResponse && estimateResponse.data[0].amountOut) {
      const amountOutEstimate = new BigNumber(estimateResponse.data[0].amountOut);
      const slippagePercentage = new BigNumber(100).minus(slippage);
      const calculatedMinAmountOut = amountOutEstimate
        .times(slippagePercentage)
        .div(100)
        .integerValue(BigNumber.ROUND_DOWN);
  
      setMinAmountOut(calculatedMinAmountOut);
    }
  }, [estimateResponse, slippage]);
  
  // handle slippage change
  const handleSlippageChange = (value) => {
    setSlippage(value);
  };
  
  // send estimate request by WebSocket
  const sendEstimateRequest = () => {
    const estimateRequest = {
      tokenIn: sellToken.address,
      tokenOut: buyToken.address,
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
      const decimalsOut = estimateResponse.liquidity.decimals1; //doto
      setEstimateAmount(new BigNumber(estimateResponse.amountOut));
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

  // Handle button clicks for target price percentage
  const handleTargetPriceSelection = (percentage) => {
    let targetPrice = new BigNumber(0);
    if (estimateResponse && estimateResponse.data[0].amountOut) {
        const amountOutEstimate = new BigNumber(estimateResponse.data[0].amountOut);
        targetPrice = amountOutEstimate.plus(amountOutEstimate.times(percentage).div(100));
    }
    setBuyAmount(targetPrice);
  };

  // place order function
  const handlePlaceOrder = async () => {
    if (!account) {
      alert("請連接錢包");
      return;
    }
  
    setIsWaitingForTransaction(true); // Show waiting modal
  
    try {
      // Initialize the contract
      const contract = new web3.eth.Contract(contractABI, contractAddress);
  
      // Prepare the transaction parameters
      const amountIn = sellAmount.toFixed(); // Amount user wants to sell
      const minAmountOutFormatted = minAmountOut.toFixed(); // Correctly reference the state minAmountOut
  
      // Call the placeOrder function on the contract
      const tx = await contract.methods
        .placeOrder(sellToken.address, buyToken.address, amountIn, minAmountOutFormatted) // Use the correct minAmountOut
        .send({ from: account })
        .on('transactionHash', (hash) => {
          setIsWaitingForTransaction(false); // Close waiting modal
          console.log("Transaction hash:", hash);
        })
        .on('receipt', (receipt) => {
          console.log("Transaction Success!", receipt);
          // Show a success notification
          notification.success({
            message: 'Order Placed Successfully',
            description: 'Your order has been placed successfully.',
            placement: 'topRight'
          });
        })
        .on('error', (error) => {
          console.error("Transaction Error:", error);
          setIsWaitingForTransaction(false); // Hide waiting modal on error
          notification.error({
            message: 'Order Failed',
            description: 'There was an error placing your order. Please try again.',
            placement: 'topRight'
          });
        });
    } catch (error) {
      console.error("Error while placing order:", error);
      setIsWaitingForTransaction(false); // Hide waiting modal on error
      notification.error({
        message: 'Order Failed',
        description: 'There was an error placing your order. Please try again.',
        placement: 'topRight'
      });
    }
  };
  

  // get user balance
  function getBalanceForToken(tokenAddress){
    const tokenData = balances[tokenAddress.toLowerCase()];
    if (!tokenData || !tokenData.balance)
      return "0.0000"; 
    const tokenBalance = toNormalUnit(tokenData.balance, tokenData.decimals); 
    return tokenBalance;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '20px', width: '400px', backgroundColor: '#f0f2f5' }}>
        {/* Sell Token Area */}
        <Card style={{ marginBottom: '20px', borderRadius: '8px' }}>
          <Text type="secondary">Sell</Text>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Input
              value={toNormalUnit(sellAmount, 18)}
              onChange={(e) => {
                const inputValue = e.target.value;

                // if input is invalid, set sellAmount 0
                if (inputValue === "" || inputValue === '0' || isNaN(inputValue)) {
                  setSellAmount("");
                  setEstimateAmount(new BigNumber(0));
                  setEffectAmount(toNormalUnit(sellAmount, 18));
                } else {
                  setSellAmount(toSmallestUnit(inputValue, 18));
                  setEffectAmount(toNormalUnit(sellAmount, 18));
                }
              }}
              style={{ fontSize: '40px', paddingLeft: "0px", border: 'none', boxShadow: 'none', outline: 'none' }}
            />
            <Button 
              onClick={() => showTokenSelection(true)} 
              style={{ fontSize: '30px', padding: '0 12px', height: '100%', display: 'flex', alignItems: 'center', backgroundColor: 'white', color: 'black' }}
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
          <Text type="secondary">Balance: { getBalanceForToken(sellToken.address)}</Text>
        </Card>

        {/* Buy Token Area */}
        <Card style={{ marginBottom: '20px', borderRadius: '8px' }}>
          <Text type="secondary">Buy</Text>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Input
              value={toNormalUnit(buyAmount, 18)}
              onChange={(e) => {
                const inputValue = e.target.value;

                // if input is invalid, set buyAmount 0
                if (inputValue === "" || inputValue === '0' || isNaN(inputValue)) {
                  return;
                } else {
                  setBuyAmount(toSmallestUnit(inputValue, 18));
                }
              }}
              style={{ fontSize: '40px', paddingLeft: "0px", border: 'none', boxShadow: 'none', outline: 'none' }}
            />
            <Button 
              onClick={() => showTokenSelection(false)} 
              style={{ fontSize: '30px', padding: '0 12px', height: '100%', display: 'flex', alignItems: 'center', backgroundColor: 'white', color: 'black' }}
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
          <Text type="secondary">Balance: { getBalanceForToken(buyToken.address)}</Text>
        </Card>

        {/* Estimate Area */}
        <Card style={{ marginBottom: '20px', borderRadius: '8px' }}>
            <Text type="secondary">Market</Text>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ fontSize: '25px', color: 'gray', display: 'flex', alignItems: 'center', paddingLeft: '0px', flex: 1 }}>
                <CountUp 
                    start={effectAmount}
                    end={toNormalUnit(estimateAmount, 18)}
                    duration={1.2}
                    decimals={3}
                />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* Buy Token Icon and Symbol */}
                {tokenIcons[buyToken.symbol] && (
                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: '10px' }}>
                    <img 
                        src={tokenIcons[buyToken.symbol]} 
                        alt={buyToken.symbol} 
                        style={{ width: '20px', marginRight: '8px' }} 
                    />
                    <Text style={{ fontSize: '16px' }}>{buyToken.symbol}</Text>
                    </div>
                )}
                
                {/* Slash Symbol */}
                <Text style={{ fontSize: '24px', margin: '0 10px' }}>/</Text>
                
                {/* Sell Token Icon and Symbol */}
                {tokenIcons[sellToken.symbol] && (
                    <div style={{ display: 'flex', alignItems: 'center', marginRight: '10px' }}>
                    <img 
                        src={tokenIcons[sellToken.symbol]} 
                        alt={sellToken.symbol} 
                        style={{ width: '20px', marginRight: '8px' }} 
                    />
                    <Text style={{ fontSize: '16px' }}>{sellToken.symbol}</Text>
                    </div>
                )}
                </div>
            </div>
            
        </Card>
            {/* Quick Select Buttons */}
            <div style={{ display: 'flex'}}>
                <Button type="default" style={{margin:' 0 10px 30px 0', fontWeight: 600}} onClick={() => handleTargetPriceSelection(5)}>+5%</Button>
                <Button type="default" style={{margin:' 0 10px 30px 0', fontWeight: 600}} onClick={() => handleTargetPriceSelection(10)}>+10%</Button>
                <Button type="default" style={{margin:' 0 10px 30px 0', fontWeight: 600}} onClick={() => handleTargetPriceSelection(20)}>+20%</Button>
                <Button type="default" style={{margin:' 0 10px 30px 0', fontWeight: 600}} onClick={() => handleTargetPriceSelection(30)}>+30%</Button>
            </div>

        <Button type="primary" block onClick={handlePlaceOrder} icon={<SwapOutlined />}>
          Place Order
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
                {tokenIcons[item.symbol] && <img src={tokenIcons[item.symbol]} alt={item.symbol} style={{ width: '30px', marginRight: '8px' }} />}
                <Text style={{ fontSize: '25px'}}>{item.symbol}</Text> 
                <Text type="secondary">Balance: {getBalanceForToken(item.address)}</Text>
              </List.Item>
            )}
          />
        </Modal>
      </div>
      <div>
        {/* Order History Component */}
        <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '20px', margin: '50px 0',width: '100%', backgroundColor: '#f0f2f5' }}>
            {account && <LimitOrderHistory accountAddress={account} tokenIcons={tokenIcons} />}
        </div>
      </div>
      {/* Waiting Modal */}
      <Modal
        title={
          <div style={{ textAlign: 'center', width: '100%', fontWeight: 'bold' }}>
            Waiting for Transaction Confirmation
          </div>
        }
        open={isWaitingForTransaction}
        footer={
          <div style={{ textAlign: 'center', color: 'blue' }}>
            <Button type="text" style={{ color: 'blue'}} onClick={() => setIsWaitingForTransaction(false)}>
              Close Window
            </Button>
          </div>
        }
        closable={false}
        centered
      >
        <div style={{ textAlign: 'center' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 70 }} spin />} style={{ margin: '50px' }} />
          <p>Please sign the transaction in your wallet...</p>
        </div>
      </Modal>
    </div>
  );
};

export default LimitOrderComponent;