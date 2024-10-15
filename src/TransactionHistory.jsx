import React, { useEffect, useState, useContext } from 'react';
import { HOST_URL } from './config';
import { Typography, Table } from 'antd';
import BigNumber from 'bignumber.js';
import { WalletContext } from './WalletProvider';
import { toNormalUnit, formatTokenAmount } from './utils';

const { Title } = Typography;

const TransactionHistory = ({ tokenIcons, latestTransaction }) => {
  const { web3, account } = useContext(WalletContext);
  const [transactions, setTransactions] = useState([]);

  // make the newest transaction data on the top
  useEffect(() => {
    if (latestTransaction) {
      setTransactions((prevTransactions) => [latestTransaction, ...prevTransactions]);
    }
  }, [latestTransaction]);

  useEffect(() => {
    if (account && web3) {
      console.log('Web3 and account initialized:', web3, account);
      fetchTransactionHistory();
    }
  }, [account, web3]);

  const fetchTransactionHistory = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/1.0/account/history/transactions?address=${account}`);
      const data = await response.json();

      const sortedData = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setTransactions(sortedData);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
    }
  };

  const columns = [
    {
      title: 'Transaction',
      dataIndex: 'transactionHash',
      key: 'transactionHash',
      responsive: ['md'],
      render: (text) => {
        if (!text) return null;
        const shortHash = `0x${text.slice(2, 6)}...${text.slice(-4)}`;
        return (
          <a href={`https://sepolia.etherscan.io/tx/${text}`} target="_blank" rel="noopener noreferrer">
            {shortHash}
          </a>
        );
      },
    },
    {
      title: 'Sell',
      dataIndex: ['tokenIn', 'symbol'],
      key: 'tokenIn',
      render: (symbol) => {
        const iconUrl = tokenIcons[symbol] || '/question.svg';
        return (
          <span>
            <img
              src={iconUrl}
              alt={symbol}
              style={{ width: '20px', height: '20px', marginRight: '8px' }}
            />
            {symbol ? symbol : 'UNKNOWN'}
          </span>
        );
      },
    },
    {
      title: 'Sell Amount',
      dataIndex: 'amountIn',
      key: 'amountIn',
      render: (amountIn, record) => {
        const decimals = record.tokenIn && record.tokenIn.decimals ? record.tokenIn.decimals : 18;
        return amountIn ? formatTokenAmount(amountIn, decimals) : '0';  // Format to 4 decimal places
      },
    },
    {
      title: 'Buy',
      dataIndex: ['tokenOut', 'symbol'],
      key: 'tokenOut',
      render: (symbol) => {
        const iconUrl = tokenIcons[symbol] || '/question.svg';
        return (
          <span>
            <img
              src={iconUrl}
              alt={symbol}
              style={{ width: '20px', height: '20px', marginRight: '8px' }}
            />
            {symbol ? symbol : 'UNKNOWN'}
          </span>
        );
      },
    },
    {
      title: 'Buy Amount',
      dataIndex: 'amountOut',
      key: 'amountOut',
      render: (amountOut, record) => {
        const decimals = record.tokenOut && record.tokenOut.decimals ? record.tokenOut.decimals : 18;
        return amountOut ? formatTokenAmount(amountOut, decimals) : '0';  // Format to 4 decimal places
      },
    },
    {
      title: 'Exchanger',
      dataIndex: 'exchanger',
      key: 'exchanger',
      render: (exchanger) => {
        if (exchanger === null || exchanger === undefined) return null;
        return exchanger === 0 ? 'Uniswap' : 'Balancer';
      },
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      responsive: ['lg'],
      render: (createdAt) => (createdAt ? new Date(createdAt).toLocaleString() : null),
    },
  ];

  return (
    <div>
      <Title level={2}>Transaction History</Title>
      <Table dataSource={transactions} columns={columns} rowKey="transactionHash" pagination={{ pageSize: 10 }} />
    </div>
  );
};

export default TransactionHistory;
