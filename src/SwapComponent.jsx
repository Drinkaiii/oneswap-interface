import React, { useState, useEffect, useContext } from 'react';
import { Button, Input, Modal, List, Typography, Card, Slider } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import CountUp from 'react-countup';
import { useWebSocket } from './WebSocketProvider';
import { WalletContext } from './WalletProvider';
import BigNumber from 'bignumber.js';

const { Text } = Typography;

const availableTokens = [
  { symbol: 'ETH', decimals: 18, address: "0xa3127E9B960DA8E7b297411728Def559bCaDf9c4" },
  { symbol: 'BTC', decimals: 18, address: "0xdE43B354d506Ce213C4bE70B750b5c6AcC09D7CA"},
  { symbol: 'USDT', decimals: 18, address: "0x9a34950F069fFB4FD58bbE906f0C36A4c51AAf00" },
  { symbol: 'ZYDB', decimals: 18, address: "0xab0b42Ac6ec6B9B29E55Ba7991887f4C374d2407" }
];

// Contract and ABI
const contractAddress = "0x635D90a6D17d228423385518Ce597300C4fE0260"; // Aggregator Contract
const contractABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "tokenIn", "type": "address" },
      { "internalType": "address", "name": "tokenOut", "type": "address" },
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "internalType": "uint256", "name": "minAmountOut", "type": "uint256" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" },
      { "internalType": "enum DexAggregator.Exchange", "name": "exchange", "type": "uint8" },
      { "internalType": "address[]", "name": "path", "type": "address[]" },
      { "internalType": "bytes32", "name": "poolId", "type": "bytes32" }
    ],
    "name": "swapTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const SwapComponent = () => {

  const { web3, account, connectWallet, errorMessage } = useContext(WalletContext);
  const [balances, setBalances] = useState({});

  const [sellToken, setSellToken] = useState(availableTokens[0]);// default: ETH
  const [buyToken, setBuyToken] = useState(availableTokens[1]);// default: BTC
  const [sellAmount, setSellAmount] = useState(new BigNumber("0"));// default: 0
  const [buyAmount, setBuyAmount] = useState(new BigNumber("0"));// default: 0
  const [effectAmount, setEffectAmount] = useState(sellAmount);

  const [slippage, setSlippage] = useState(1); // default: 1%
  const [minAmountOut, setMinAmountOut] = useState(new BigNumber("0")); // default: 0

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSelectingSell, setIsSelectingSell] = useState(true);
  const [tokenIcons, setTokenIcons] = useState({});

  const { client, connected, sessionId, estimateResponse } = useWebSocket();

  // fetch user and token data
  useEffect(() => {
    fetchTokenIcons();
  }, []);

  // Fetch user's wallet balance from Worker back-end
  useEffect(() => {
    if (account)
      fetchAccountBalances(); // fetch account info again if account change
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

  async function fetchAccountBalances() {

    if (!account) {
      console.warn('Wallet not connected');
      return;
    }
    try {
      const response = await fetch(`http://localhost:8080/api/1.0/account/info?address=${account}`);
      const data = await response.json();
      
      const balanceMap = {};
      data.forEach(token => {
        const balance = new BigNumber(token.balance, 16);
        balanceMap[token.tokenAddress.toLowerCase()] = {
          balance: balance,
          decimals: token.decimals
        };
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error('Error fetching account balances:', error);
    }
  }

  // handle response from WebSocket
  const handleEstimateResponse = (data) => {
    if (data.type === 'estimate' && data.status === 'success') {
      const estimateResponse = data.data[0];
      const decimalsOut = estimateResponse.liquidity.decimals1; //doto
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
  const handleSwap = async () => {

    if (!account){
      alert("請連接錢包");
      return;
    }
    try {
  
      // initialize the contract
      const contract = new web3.eth.Contract(contractABI, contractAddress);
  
      // prepare the parameters
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
      const exchanger = estimateResponse.data[0].liquidity.exchanger === "Uniswap" ? 0 : 1;
      const poolId = estimateResponse.data[0].liquidity.poolId !== null ? estimateResponse.data[0].liquidity.poolId : "0xc1e0942d3babe2ce30a78d0702a8b5ace651505400020000000000000000014d"; //default is WETH/WBTC poolId

      // constract transaction
      const transactionParameters = {
        tokenIn: sellToken.address,
        tokenOut: buyToken.address,
        amountIn: sellAmount.toFixed(),
        minAmountOut: minAmountOut.toFixed(),
        deadline: deadline,
        exchange: exchanger,
        path: [sellToken.address, buyToken.address],
        poolId: poolId
      };
      console.log(transactionParameters);
  
      // send the transaction
      const tx = await contract.methods.swapTokens(
        transactionParameters.tokenIn,
        transactionParameters.tokenOut,
        transactionParameters.amountIn,
        transactionParameters.minAmountOut,
        transactionParameters.deadline,
        transactionParameters.exchange,
        transactionParameters.path,
        transactionParameters.poolId
      ).send({ from: account });
  
      // get tx
      console.log("Transaction success!", tx);
  
    } catch (error) {
      console.error("Error while swapping tokens:", error);
    }
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

  // get user balance
  function getBalanceForToken(tokenAddress){
    const tokenData = balances[tokenAddress.toLowerCase()];
    if (!tokenData || !tokenData.balance)
      return "0.0000"; 
    const tokenBalance = toNormaltUnit(tokenData.balance, tokenData.decimals); 
    return tokenBalance;
  };

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '20px', width: '400px', backgroundColor: '#f0f2f5' }}>
      {/* Sell Token Area */}
      <Card style={{ marginBottom: '20px', borderRadius: '8px' }}>
        <Text type="secondary">Sell</Text>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Input
            value={toNormaltUnit(sellAmount, 18)}
            onChange={(e) => {
              const inputValue = e.target.value;

              // if input is invalid, set sellAmount 0
              if (inputValue === "" || inputValue === '0' || isNaN(inputValue)) {
                setSellAmount("");
                setBuyAmount(new BigNumber(0));
                setEffectAmount(toNormaltUnit(sellAmount, 18));
              } else {
                setSellAmount(toSmallestUnit(inputValue, 18));
                setEffectAmount(toNormaltUnit(sellAmount, 18));
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
          <div style={{ fontSize: '40px', paddingLeft: "0px", flex: 1 }}>
            <CountUp 
              start={effectAmount}
              end={toNormaltUnit(buyAmount,18)}
              duration={1.2}
              decimals={3}
            />
          </div>

          <Button 
            onClick={() => showTokenSelection(false)} 
            style={{ fontSize: '30px', padding: '0 12px', height: '100%', display: 'flex', alignItems: 'center', backgroundColor: 'white', color: 'black'}}
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
        <Text type="secondary">Balance: {getBalanceForToken(buyToken.address)}</Text>
      </Card>

      {/* Slippage Control */}
      <div style={{ marginBottom: '20px' }}>
        <Text type="secondary">Slippage: {slippage}%</Text>
        <Slider
          min={0.1}
          max={5}
          step={0.1}
          value={slippage}
          onChange={handleSlippageChange}
        />
      </div>

      {estimateResponse && (
            <div style={{marginBottom: "15px"}}>
              <Text type="secondary" style={{ display: 'block' }}>Best Exchange: {estimateResponse.data[0].liquidity.exchanger}</Text>
              <Text type="secondary" style={{ display: 'block' }}>Min Amount Get: {toNormaltUnit(minAmountOut,18)}</Text>
            </div>
        )}

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
              {tokenIcons[item.symbol] && <img src={tokenIcons[item.symbol]} alt={item.symbol} style={{ width: '30px', marginRight: '8px' }} />}
              <Text style={{ fontSize: '25px'}}>{item.symbol}</Text> 
              <Text type="secondary">Balance: {getBalanceForToken(item.address)}</Text>
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default SwapComponent;