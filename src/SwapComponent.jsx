import React, { useState, useEffect, useContext } from 'react';
import { Button, Input, Modal, List, Typography, Card, Slider, Spin, notification  } from 'antd';
import { SwapOutlined, LoadingOutlined } from '@ant-design/icons';
import CountUp from 'react-countup';
import { useWebSocket } from './WebSocketProvider';
import { WalletContext } from './WalletProvider';
import BigNumber from 'bignumber.js';
import TransactionHistory from './TransactionHistory';
import { fetchAccountBalances, fetchTokenIcons, toNormalUnit, toSmallestUnit } from './utils';
import './SwapComponent.css';

const { Text } = Typography;

const availableTokens = [
  { symbol: 'ETH', code: 'ethereum', decimals: 18, address: "0xa3127E9B960DA8E7b297411728Def559bCaDf9c4" },
  { symbol: 'WBTC', code: 'wrapped-bitcoin', decimals: 18, address: "0xdE43B354d506Ce213C4bE70B750b5c6AcC09D7CA"},
  { symbol: 'USDT', code: 'tether', decimals: 18, address: "0x9a34950F069fFB4FD58bbE906f0C36A4c51AAf00" },
  { symbol: 'ZYDB', code: 'zydb', decimals: 18, address: "0xab0b42Ac6ec6B9B29E55Ba7991887f4C374d2407" }
];

// Contract and ABI
const contractAddress = "0x635D90a6D17d228423385518Ce597300C4fE0260"; // Aggregator Contract
const contractABI = [{"inputs":[{"internalType":"address","name":"_uniswapRouter","type":"address"},{"internalType":"address","name":"_balancerVault","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"trader","type":"address"},{"indexed":true,"internalType":"address","name":"tokenIn","type":"address"},{"indexed":true,"internalType":"address","name":"tokenOut","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountIn","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amountOut","type":"uint256"},{"indexed":false,"internalType":"enum DexAggregator.Exchange","name":"exchange","type":"uint8"}],"name":"TradeExecuted","type":"event"},{"inputs":[],"name":"balancerVault","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"feePercent","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"minAmountOut","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"enum DexAggregator.Exchange","name":"exchange","type":"uint8"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"bytes32","name":"poolId","type":"bytes32"}],"name":"swapTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"uniswapRouter","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"newFeePercent","type":"uint256"}],"name":"updateFeePercent","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"}];

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
      // Show an error notification
      notification.error({
        message: 'Transaction Failed',
        description: 'There was no wallet connection. Please connect your wallet.',
        placement: 'topRight'
      });
      return;
    }

    setIsWaitingForTransaction(true); // Show waiting modal

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
      ).send({ from: account })
      .on('transactionHash', (hash) => {
        // Immediately close the waiting modal after transaction is signed
        setIsWaitingForTransaction(false);
      })
      .on('receipt', (receipt) => {
        console.log("Transaction Success!", receipt);
        // Show a success notification
        notification.success({
          message: 'Transaction Successful',
          description: 'Your transaction has been confirmed successfully.',
          placement: 'topRight'
        });
      })
      .on('error', (error) => {
        console.error("Transaction Error:", error);
        // Hide the modal in case of an error
        setIsWaitingForTransaction(false);
        // Show an error notification
        notification.error({
          message: 'Transaction Failed',
          description: 'There was an error processing your transaction. Please try again.',
          placement: 'topRight'
        });
      });
  
      // get tx
      console.log("Transaction success!", tx);
      const events = tx.events;
      console.log(events);
      const eventAbi = contractABI.find(
        (item) => item.type === 'event' && item.name === 'TradeExecuted'
      );

      if (eventAbi) {
        const eventSignature = web3.eth.abi.encodeEventSignature(eventAbi);

        tx.logs.forEach((log) => {
          if (log.topics[0] === eventSignature) {
            const decodedEvent = web3.eth.abi.decodeLog(
              eventAbi.inputs,
              log.data,
              log.topics.slice(1)
            );
            const newTransaction = {
              transactionHash: tx.transactionHash,
              tokenIn: {
                symbol: sellToken.symbol,
                address: decodedEvent.tokenIn,
                decimals: sellToken.decimals,
              },
              tokenOut: {
                symbol: buyToken.symbol,
                address: decodedEvent.tokenOut,
                decimals: buyToken.decimals,
              },
              amountIn: decodedEvent.amountIn.toString(),
              amountOut: decodedEvent.amountOut.toString(),
              exchanger: decodedEvent.exchange,
              createdAt: new Date().toISOString(),
            };
            setLatestTransaction(newTransaction);
          }
        });
      } else {
        console.error("TradeExecuted event ABI not found");
        setIsWaitingForTransaction(false); // Hide waiting modal when done
      }
    } catch (error) {
      console.error("Error while swapping tokens:", error);
      setIsWaitingForTransaction(false); // Hide waiting modal on error
      // Show an error notification
      notification.error({
        message: 'Transaction Failed',
        description: 'There was an error processing your transaction. Please try again.',
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
    <div className="swap-container">
      <div className="swap-card">
        {/* Sell Token Area */}
        <Card className="token-card sell-token">
          <Text className="token-label">Sell</Text>
          <div className="token-input">
            <Input
              className="amount-input"
              value={toNormalUnit(sellAmount, 18)}
              onChange={(e) => {
                const inputValue = e.target.value;
                if (inputValue === "" || inputValue === '0' || isNaN(inputValue)) {
                  setSellAmount("");
                  setBuyAmount(new BigNumber(0));
                  setEffectAmount(toNormalUnit(sellAmount, 18));
                } else {
                  setSellAmount(toSmallestUnit(inputValue, 18));
                  setEffectAmount(toNormalUnit(sellAmount, 18));
                }
              }}
            />
            <Button 
              className="token-select-button"
              onClick={() => showTokenSelection(true)}
            >
              {tokenIcons[sellToken.symbol] && (
                <img 
                  className="token-icon"
                  src={tokenIcons[sellToken.symbol]} 
                  alt={sellToken.symbol}
                />
              )}
              {sellToken.symbol}
            </Button>
          </div>
          <Text className="balance-text">Balance: {getBalanceForToken(sellToken.address)}</Text>
        </Card>

        {/* Buy Token Area */}
        <Card className="token-card buy-token">
          <Text className="token-label">Buy</Text>
          <div className="token-input">
            <div className="amount-display">
              <CountUp 
                start={effectAmount}
                end={toNormalUnit(buyAmount,18)}
                duration={1.2}
                decimals={3}
              />
            </div>
            <Button 
              className="token-select-button"
              onClick={() => showTokenSelection(false)}
            >
              {tokenIcons[buyToken.symbol] && (
                <img 
                  className="token-icon"
                  src={tokenIcons[buyToken.symbol]} 
                  alt={buyToken.symbol}
                />
              )}
              {buyToken.symbol}
            </Button>
          </div>
          <Text className="balance-text">Balance: {getBalanceForToken(buyToken.address)}</Text>
        </Card>

        {/* Slippage Control */}
        <div className="slippage-control">
          <Text className="slippage-label">Slippage: {slippage}%</Text>
          <Slider
            className="slippage-slider"
            min={0.1}
            max={5}
            step={0.1}
            value={slippage}
            onChange={handleSlippageChange}
          />
        </div>

        {estimateResponse && (
          <div className="estimate-info">
            <Text className="estimate-text">Best Exchange: {estimateResponse.data[0].liquidity.exchanger}</Text>
            <Text className="estimate-text">Min Amount Get: {toNormalUnit(minAmountOut,18)}</Text>
          </div>
        )}

        <Button className="swap-button ant-btn ant-btn-primary" type="primary" onClick={handleSwap} icon={<SwapOutlined />}>
          Swap
        </Button>
      </div>
      
      <div className="transaction-history-container">
        <TransactionHistory account={account} tokenIcons={tokenIcons} latestTransaction={latestTransaction} />
      </div>

      {/* Token Selection Modal */}
      <Modal
        title="Select a token"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        className="token-selection-modal"
      >
        <List
          className="select-token-list"
          dataSource={availableTokens}
          renderItem={(item) => (
            <List.Item className="select-token-list-item" onClick={() => handleTokenSelect(item)}>
              {tokenIcons[item.symbol] && <img className="token-icon" src={tokenIcons[item.symbol]} alt={item.symbol} />}
              <Text className="token-name">{item.symbol}</Text> 
              <Text className="token-balance">Balance: {getBalanceForToken(item.address)}</Text>
            </List.Item>
          )}
        />
      </Modal>

      {/* Waiting Modal */}
      <Modal
        title={
          <div className="waiting-modal-title">
            Waiting for Transaction Confirmation
          </div>
        }
        open={isWaitingForTransaction}
        footer={
          <div className="waiting-modal-footer">
            <Button type="text" className="close-button" onClick={() => setIsWaitingForTransaction(false)}>
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
          <p>Please sign the transaction in your wallet...</p>
        </div>
      </Modal>
    </div>
  );
};

export default SwapComponent;