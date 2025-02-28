import React, { useState, useEffect, useContext } from 'react';
import { Button, Modal, List, Typography, Card, Spin, notification, Alert } from 'antd';
import { SwapOutlined, LoadingOutlined, } from '@ant-design/icons';
import CountUp from 'react-countup';
import { NumericFormat } from 'react-number-format';
import { useTokens } from './TokenProvider';
import { useWebSocket } from './WebSocketProvider';
import { WalletContext } from './WalletProvider';
import BigNumber from 'bignumber.js';
import LimitOrderHistory  from './LimitOrderHistory';
import { fetchAccountBalances, toNatureUnit, toSmallestUnit } from './utils';
import AdvancedSettings, { useAdvancedSettings } from './AdvancedSettings';
import './LimitOrderComponent.css';

const { Text } = Typography;

// Contract and ABI
const contractAddress = "0x08dfC836a3343618ffB412FFaDF3B882cB98852b"; // New Order Contract
const contractABI = [{"inputs":[{"internalType":"address","name":"_dexAggregator","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"user","type":"address"}],"name":"OrderCancelled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountOut","type":"uint256"}],"name":"OrderExecuted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"orderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"address","name":"tokenIn","type":"address"},{"indexed":false,"internalType":"address","name":"tokenOut","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountIn","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"minAmountOut","type":"uint256"}],"name":"OrderPlaced","type":"event"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"name":"cancelOrder","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"dexAggregator","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"orderId","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"uint8","name":"exchange","type":"uint8"},{"internalType":"bytes32","name":"poolId","type":"bytes32"}],"name":"executeOrder","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"nextOrderId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"minAmountOut","type":"uint256"}],"name":"placeOrder","outputs":[{"internalType":"uint256","name":"orderId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"}];
const erc20ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }, { name: "_spender", type: "address" }],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [{ name: "_spender", type: "address" }, { name: "_value", type: "uint256" }],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  }
];

const LimitOrderComponent = () => {

  const { web3, account, connectWallet, errorMessage } = useContext(WalletContext);
  const [balances, setBalances] = useState({});

  const { tokenIcons, availableTokens } = useTokens();
  const [sellToken, setSellToken] = useState(availableTokens[0]);// default: ETH
  const [buyToken, setBuyToken] = useState(availableTokens[1]);// default: BTC
  const [sellAmount, setSellAmount] = useState(new BigNumber("0"));// default: 0
  const [buyAmount, setBuyAmount] = useState(new BigNumber("0"));// default: 0
  const [estimateAmount, setEstimateAmount] = useState(new BigNumber("0"));// default: 0
  const [effectAmount, setEffectAmount] = useState(sellAmount);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSelectingSell, setIsSelectingSell] = useState(true);

  // State for waiting modal
  const [isWaitingForTransaction, setIsWaitingForTransaction] = useState(false);

  const { client, connected, sessionId, estimateResponse, gasPrice, resetEstimateResponse } = useWebSocket();

  const [latestTransaction, setLatestTransaction] = useState(null);
  const [cancelledOrders, setCancelledOrders] = useState([]);
  const [isInsufficientBalance, setIsInsufficientBalance] = useState(false);
  const [isApprovalNeeded, setIsApprovalNeeded] = useState(false);

  const {gasFeeOption,} = useAdvancedSettings();
  const [adjustedGasPrice, setAdjustedGasPrice] = useState(null);

  const [balancesLoading, setBalancesLoading] = useState(false);
  const [isTransactionInProgress, setIsTransactionInProgress] = useState(false);
  
  const [isSellMaxDigits, setIsSellMaxDigits] = useState(false);
  const [isBuyMaxDigits, setIsBuyMaxDigits] = useState(false);

  const [isBelowMarketPrice, setIsBelowMarketPrice] = useState(false);

  // RWD
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);

  // Fetch user's wallet balance from Worker back-end
  useEffect(() => {
    if (account) {
      setBalancesLoading(true);
      fetchAccountBalances(account, (newBalances) => {
        setBalances(newBalances);
        setBalancesLoading(false);
      });
    } else {
      setBalances({});
      setBalancesLoading(false);
    }
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

  // Check balance amount
  useEffect(() => {
    if (sellAmount && sellToken) {
      checkBalance();
    }
  }, [sellAmount, sellToken, balances]);

  // Check approval when sellAmount or sellToken changes
  useEffect(() => {
    
    if (account && web3 && sellAmount && sellAmount.gt(0)) {
      checkApprovalNeeded(sellToken.address, contractAddress, sellAmount)
      .then((approvalNeeded) => {
        setIsApprovalNeeded(approvalNeeded);
      })
      .catch((error) => {
        console.error("Error checking approval:", error);
      });
    }
  }, [account, web3, sellAmount, sellToken]);

  useEffect(() => {
    if (gasPrice) {
      let adjustedPrice;
      switch (gasFeeOption) {
        case 'fast':
          adjustedPrice = new BigNumber(gasPrice).times(1.5).integerValue().toString();
          break;
        case 'fastest':
          adjustedPrice = new BigNumber(gasPrice).times(2).integerValue().toString();
          break;
        default:
          adjustedPrice = gasPrice;
      }
      setAdjustedGasPrice(adjustedPrice);
    }
  }, [gasPrice, gasFeeOption]);

  // reset estimate response in first loading page
  useEffect(() => {
    resetEstimateResponse();
    setEstimateAmount(new BigNumber(0));
  }, []);

  useEffect(() => {
    if (estimateAmount.gt(0) && sellAmount.gt(0)) {
      setIsBelowMarketPrice(buyAmount.lt(estimateAmount));
    } else {
      setIsBelowMarketPrice(false);
    }
  }, [estimateAmount, sellAmount, buyAmount]);

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
    if (data.type === 'estimate' && data.status === 'success' && data.data.length !== 0) {
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

    if (!account){
        // Show an error notification
        notification.error({
          message: 'Transaction Failed',
          description: 'There was no wallet connection. Please connect your wallet.',
          placement: 'topRight'
        });
        return;
      }

    // Input validation
    if (!sellAmount || sellAmount.isNaN() || sellAmount.lte(0)) {
      notification.error({
        message: 'Invalid Input',
        description: 'Please enter a valid positive number for the amount to sell.',
        placement: 'topRight'
      });
      return;
    }

    // Show waiting modal
    setIsWaitingForTransaction(true);
    setIsTransactionInProgress(true);

    // check and ensure approval
    if (checkApprovalNeeded)
      await executeApproval(sellToken.address, contractAddress, sellAmount.toString());

  
    try {
      // Initialize the contract
      const contract = new web3.eth.Contract(contractABI, contractAddress);
  
      // Prepare the transaction parameters
      const amountIn = sellAmount.toFixed(); // Amount user wants to sell
      const amountOut = buyAmount.toFixed(); // Correctly reference the state buyAmount
  
      const transactionOptions = (gasFeeOption === "normal")
        ? { from: account }
        : { from: account, gasPrice: adjustedGasPrice };

      // Call the placeOrder function on the contract
      const tx = await contract.methods
        .placeOrder(sellToken.address, buyToken.address, amountIn, amountOut) // Use the correct minAmountOut
        .send(transactionOptions)
        .on('transactionHash', (hash) => {
          setIsWaitingForTransaction(false); // Close waiting modal
          console.log("Transaction hash:", hash);
        })
        .on('receipt', (receipt) => {
          console.log("Transaction Success!", receipt);

          const newTransaction = {
              orderId: receipt.events.OrderPlaced.returnValues.orderId.toString(),
              tokenIn: { symbol: sellToken.symbol, decimals: sellToken.decimals },
              tokenOut: { symbol: buyToken.symbol, decimals: buyToken.decimals },
              amountIn: amountIn,
              minAmountOut: amountOut,
              finalAmountOut: receipt.events.OrderExecuted ? receipt.events.OrderExecuted.returnValues.amountOut : null,
              status: receipt.events.OrderExecuted ? 'filled' : 'unfilled',
          };
          console.log(newTransaction);
          setLatestTransaction(newTransaction);

          notification.success({
              message: 'Order Placed Successfully',
              description: 'Your order has been placed successfully.',
              placement: 'topRight'
          });

          // Update balances after successful transaction
          updateBalances();
          setIsTransactionInProgress(false);
        })
        .on('error', (error) => {
          console.error("Transaction Error:", error);
          setIsWaitingForTransaction(false); // Hide waiting modal on error
          setIsTransactionInProgress(false);
          notification.error({
            message: 'Order Failed',
            description: 'There was an error placing your order. Please try again.',
            placement: 'topRight'
          });
        });
    } catch (error) {
      console.error("Error while placing order:", error);
      setIsWaitingForTransaction(false); // Hide waiting modal on error
      setIsTransactionInProgress(false);
      notification.error({
        message: 'Order Failed',
        description: 'There was an error placing your order. Please try again.',
        placement: 'topRight'
      });
    }
  };

  // Function to handle order cancellation
const handleCancelOrder = async (orderId) => {
    if (!account || !web3) {
      notification.error({
        message: 'Cancellation Failed',
        description: 'No wallet connection found. Please connect your wallet.',
        placement: 'topRight',
      });
      return;
    }

    // Show waiting modal
    setIsWaitingForTransaction(true);
  
    try {
      // Initialize contract
      const contract = new web3.eth.Contract(contractABI, contractAddress);
      
      const transactionOptions = (gasFeeOption === "normal")
        ? { from: account }
        : { from: account, gasPrice: adjustedGasPrice };

      // Call the cancelOrder method
      await contract.methods.cancelOrder(orderId).send(transactionOptions)
        .on('transactionHash', (hash) => {
          console.log("Transaction hash for cancellation:", hash);
          setIsWaitingForTransaction(false);
        })
        .on('receipt', (receipt) => {
          console.log("Order cancellation successful!", receipt);
          setIsWaitingForTransaction(false);
          notification.success({
            message: 'Order Cancelled',
            description: `Order ${orderId} has been successfully cancelled.`,
            placement: 'topRight',
          });
          
          // Add the cancelled order ID to the state
          setCancelledOrders(prev => [...prev, orderId]);

          // Update balances after successful transaction
          updateBalances();
        })
        .on('error', (error) => {
          console.error("Cancellation Error:", error);
          setIsWaitingForTransaction(false);
          notification.error({
            message: 'Cancellation Failed',
            description: `Failed to cancel order ${orderId}. Please try again.`,
            placement: 'topRight',
          });
        });
    } catch (error) {
      console.error("Error while cancelling order:", error);
      setIsWaitingForTransaction(false);
    }
  };  

  // get user balance
  function getBalanceForToken(tokenAddress) {
    const tokenData = balances[tokenAddress.toLowerCase()];
    if (!tokenData || !tokenData.balance)
      return new BigNumber(0);
    return new BigNumber(tokenData.balance);
  }

  // check balance
  const checkBalance = () => {
    const tokenBalance = balances[sellToken.address.toLowerCase()]?.balance || "0";
    const hasInsufficientBalance = new BigNumber(sellAmount).gt(new BigNumber(tokenBalance));
    setIsInsufficientBalance(hasInsufficientBalance);
  };

  // check if approval is needed
  const checkApprovalNeeded = async (tokenAddress, spender, amount) => {
    const tokenContract = new web3.eth.Contract(erc20ABI, tokenAddress);
    const allowance = await tokenContract.methods.allowance(account, spender).call();
    const result = new BigNumber(allowance).lt(new BigNumber(amount));
    return result;
  };

  // executeApproval function
  const executeApproval = async (tokenAddress, spender, amount) => {
    const needsApproval = await checkApprovalNeeded(tokenAddress, spender, amount);
    if (needsApproval) {
      const tokenContract = new web3.eth.Contract(erc20ABI, tokenAddress);
      try {
        const amountToApprove = new BigNumber(amount).toFixed(); // Convert BigNumber to string (without scientific notation)
        
        const promiEvent = tokenContract.methods.approve(spender, amountToApprove).send({ from: account });
  
        promiEvent.on('transactionHash', (hash) => {
          setIsWaitingForTransaction(false);
          const etherscanUrl = `https://sepolia.etherscan.io/tx/${hash}`;
          notification.success({
            message: 'Approval Transaction Sent',
            description: (
              <Button
                type="link"
                href={etherscanUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Etherscan
              </Button>
            ),
            placement: 'topRight',
          });
        });
  
        promiEvent.on('receipt', (receipt) => {
          setIsWaitingForTransaction(false);
          setIsApprovalNeeded(false);
          const etherscanUrl = `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`;
          notification.success({
            message: 'Approval Confirmed',
            description: (
              <Button
                type="link"
                href={etherscanUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Etherscan
              </Button>
            ),
            placement: 'topRight',
          });
        });
  
        promiEvent.on('error', (error) => {
          setIsWaitingForTransaction(false);
          console.error("Approval transaction failed or was canceled (event):", error);
          notification.error({
            message: 'Approval Failed or Canceled',
            description: error.message,
            placement: 'topRight',
          });
        });
  
        await promiEvent; // Wait for transaction to be mined or fail
        return true; // Approval was needed and successfully completed
      } catch (error) {
        // This catch block handles errors thrown during the send() call
        console.error("Error during approval transaction:", error);
        setIsWaitingForTransaction(false);
        notification.error({
          message: 'Approval Failed or Canceled',
          description: error.message,
          placement: 'topRight',
        });
        throw error; // Re-throw the error to be handled by the calling function
      }
    }
    return false; // No approval was needed
  };

  const handleSwapTokens = () => {
    
    // exchange token
    const tempToken = sellToken;
    setSellToken(buyToken);
    setBuyToken(tempToken);
  
    // switch the amount
    // const tempAmount = sellAmount;
    // setSellAmount(buyAmount);
    // setBuyAmount(tempAmount);
    // setEffectAmount(buyAmount);
  
    // get new estimate response
    // if (buyAmount.gt(0)) {
    //   sendEstimateRequest();
    // }
  };

  const handleSellAmountChange = (values) => {
    const { value } = values;
    if (value === "" || value === '0') {
      setSellAmount(new BigNumber(0));
      setEffectAmount(new BigNumber(0));
      setEstimateAmount(new BigNumber(0));
    } else {
      const newSellAmount = new BigNumber(value);
      setSellAmount(toSmallestUnit(newSellAmount, sellToken.decimals));
      setEffectAmount(toNatureUnit(buyAmount, buyToken.decimals));
    }
    checkBalance();

    // check max input digital
    const parts = value.split('.');
    const integerPart = parts[0].replace(/,/g, '');
    setIsSellMaxDigits(integerPart.length >= 15);
  };
  
  const handleBuyAmountChange = (values) => {
    const { value } = values;
    if (value === "" || value === '0') {
      setBuyAmount(new BigNumber(0));
    } else {
      const newBuyAmount = new BigNumber(value);
      setBuyAmount(toSmallestUnit(newBuyAmount, buyToken.decimals));
    }

    // check max input digital
    const parts = value.split('.');
    const integerPart = parts[0].replace(/,/g, '');
    setIsBuyMaxDigits(integerPart.length >= 15);
  };

  // Function to check if a token is disabled
  const isTokenDisabled = (token) => {
    return token.address === sellToken.address || token.address === buyToken.address;
  };

  const handleMaxClick = (token, callback) => {
    const balance = getBalanceForToken(token.address);
    callback(balance);
  };

  const updateBalances = () => {
    if (account) {
      setBalancesLoading(true);
      fetchAccountBalances(account, (newBalances) => {
        setBalances(newBalances);
        setBalancesLoading(false);
      });
    }
  };

  const getButtonText = () => {
    if (isTransactionInProgress) {
      return <Spin indicator={<LoadingOutlined style={{ fontSize: 24, color: 'var(--green)' }} spin />} />;
    }
    if (isInsufficientBalance) return 'Insufficient Balance';
    if (isApprovalNeeded) return 'Approve Required';
    if (isBelowMarketPrice) return 'Price Below Market';
    return 'Place Order';
  };

  return (
    <div className="limit-order-container">
      <div className="limit-order-card">
        {/* Sell Token Area */}
        <Card className="token-card sell-token">
          <Text className="token-label">Sell</Text>
          <div className="token-input">
            <NumericFormat
              className="amount-input"
              value={sellAmount.isZero() ? '' : toNatureUnit(sellAmount, sellToken.decimals)}
              onValueChange={handleSellAmountChange}
              thousandSeparator={true}
              decimalScale={sellToken.decimals}
              allowNegative={false}
              placeholder="0"
              isAllowed={(values) => {
                const { value } = values;
                const parts = value.split('.');
                const integerPart = parts[0].replace(/,/g, '');
                const decimalPart = parts[1] || '';
                return integerPart.length <= 15 && decimalPart.length <= 18;
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
          <div className="balance-container">
            <Text className="balance-text">
              Balance: <span className="balance-value">
                {balancesLoading ? (
                  <Spin size="small" indicator={<LoadingOutlined style={{ fontSize: 14, color: 'rgba(0, 0, 0, 0.25)' }} spin />} />
                ) : (
                  toNatureUnit(getBalanceForToken(sellToken.address), sellToken.decimals, 4)
                )}
              </span>
            </Text>
            <Button className="balance-max-button" onClick={() => handleMaxClick(sellToken, setSellAmount)} size="small">Max</Button>
          </div>
          {isSellMaxDigits && (
            <Alert
              className="max-digits-alert"
              message="Maximum number of digits reached"
              type="warning"
              showIcon
            />
          )}
        </Card>

        {/* Switch button */}
        <Button
          className="switch-tokens-button"
          icon={<SwapOutlined rotate={90} />}
          onClick={handleSwapTokens}
        />

        {/* Buy Token Area */}
        <Card className="token-card buy-token">
          <Text className="token-label">Buy</Text>
          <div className="token-input">
            <NumericFormat
              className="amount-input"
              value={buyAmount.isZero() ? '' : toNatureUnit(buyAmount, buyToken.decimals)}
              onValueChange={handleBuyAmountChange}
              thousandSeparator={true}
              decimalScale={buyToken.decimals}
              allowNegative={false}
              placeholder="0"
              isAllowed={(values) => {
                const { value } = values;
                const parts = value.split('.');
                const integerPart = parts[0].replace(/,/g, '');
                const decimalPart = parts[1] || '';
                return integerPart.length <= 15 && decimalPart.length <= 18;
              }}
            />
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
          <Text className="balance-text">
            Balance: <span className="balance-value">
              {balancesLoading ? (
                <Spin size="small" indicator={<LoadingOutlined style={{ fontSize: 14, color: 'rgba(0, 0, 0, 0.25)' }} spin />} />
              ) : (
                toNatureUnit(getBalanceForToken(buyToken.address),buyToken.decimals, 4)
              )}
            </span>
          </Text>
          {isBuyMaxDigits && (
            <Alert
              className="max-digits-alert"
              message="Maximum number of digits reached"
              type="warning"
              showIcon
            />
          )}
          {isBelowMarketPrice && (
            <Alert
              className="below-market-price-alert"
              message="The price you entered is below the current market price."
              type="warning"
              showIcon
            />
          )}
        </Card>

        {/* Estimate Area */}
        <Card className="estimate-card">
          <Text className="estimate-label">Market</Text>
          <div className="estimate-content">
            <div className="estimate-amount">
              <CountUp 
                start={effectAmount}
                end={parseFloat(toNatureUnit(estimateAmount, buyToken.decimals))}
                duration={1.2}
                decimals={3}
              />
            </div>
            <div className="estimate-tokens">
              <div className="token-display">
                <img className="token-icon" src={tokenIcons[buyToken.symbol]} alt={buyToken.symbol} />
                <Text className="token-symbol">{buyToken.symbol}</Text>
              </div>
              {!isMobileView && <Text className="separator">/</Text>}
              {!isMobileView && <div className="token-display">
                <img className="token-icon" src={tokenIcons[sellToken.symbol]} alt={sellToken.symbol} />
                <Text className="token-symbol">{sellToken.symbol}</Text>
              </div>}
            </div>
          </div>
        </Card>

        {/* Quick Select Buttons */}
        <div className="quick-select-buttons">
          <Button className="percentage-button" onClick={() => handleTargetPriceSelection(5)}>+5%</Button>
          <Button className="percentage-button" onClick={() => handleTargetPriceSelection(10)}>+10%</Button>
          <Button className="percentage-button" onClick={() => handleTargetPriceSelection(20)}>+20%</Button>
          <Button className="percentage-button" onClick={() => handleTargetPriceSelection(30)}>+30%</Button>
        </div>

        <Button 
          className="place-order-button ant-btn ant-btn-primary" 
          type="primary" 
          onClick={handlePlaceOrder} 
          // icon={!isTransactionInProgress && <SwapOutlined />}
          disabled={isInsufficientBalance || isTransactionInProgress || isBelowMarketPrice}
        >
          {getButtonText()}
        </Button>
        <AdvancedSettings showSlippage={false} showDeadline={false}/>
      </div>
      {/* Order History Component */}
      {!isMobileView && <div className="order-history-container">
        <LimitOrderHistory 
          account={account} 
          tokenIcons={tokenIcons} 
          latestTransaction={latestTransaction} 
          cancelledOrders={cancelledOrders}
          handleCancelOrder={handleCancelOrder}
        />
      </div> }

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
            <List.Item 
              className="select-token-list-item" 
              onClick={() => !isTokenDisabled(item) && handleTokenSelect(item)}
              style={{ 
                cursor: isTokenDisabled(item) ? 'not-allowed' : 'pointer',
                opacity: isTokenDisabled(item) ? 0.5 : 1
              }}
            >
              <div className="token-icon-name">
                {tokenIcons[item.symbol] && <img className="token-icon" src={tokenIcons[item.symbol]} alt={item.symbol} />}
                <Text className="token-symbol">{item.symbol}</Text>
              </div>
              <Text className="token-balance">
                {isTokenDisabled(item) ? '(Already selected)' : `Balance: ${toNatureUnit(getBalanceForToken(item.address), item.decimals, 4)}`}
              </Text>
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
          <p>Please sign the transaction in your wallet...</p>
        </div>
      </Modal>
    </div>
  );
};

export default LimitOrderComponent;