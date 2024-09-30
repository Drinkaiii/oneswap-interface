import React, { useState, useEffect } from 'react';
import { formatTokenAmount } from './utils';
import { Table, Typography, Spin, Button } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import BigNumber from 'bignumber.js';

const { Title, Text } = Typography;

const host = "https://d1edophfzx4z61.cloudfront.net";

const OrderHistory = ({ account, tokenIcons, latestTransaction, handleCancelOrder }) => {
  const [orderHistory, setOrderHistory] = useState([]); // State to store order history
  const [isLoading, setIsLoading] = useState(false); // State for loading

  // Fetch order history when the component loads
  useEffect(() => {
    if (account) {
      fetchOrderHistory(account);
    }
  }, [account]);

  // listen the newsest transaction
  useEffect(() => {
    if (latestTransaction) {
      setOrderHistory((prevHistory) => [latestTransaction, ...prevHistory]);
    }
  }, [latestTransaction]);

  // Function to fetch order history using fetch API
  const fetchOrderHistory = async (address) => {
    setIsLoading(true); // Start loading
    try {
      const response = await fetch(`${host}/api/1.0/account/history/limitOrders?address=${address}`);
      
      if (!response.ok)
        throw new Error('Failed to fetch order history');
      const data = await response.json();
      setOrderHistory(data); // Save the history in the state
    } catch (error) {
      console.error("Failed to fetch order history:", error);
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  // Define table columns
  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'orderId',
      key: 'orderId',
      sorter: (a, b) => BigNumber(b.orderId).minus(BigNumber(a.orderId)).toNumber(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Text type={status === 'filled' ? 'success' : 'warning'}>{status}</Text>,
    },
    {
      title: 'Sell',
      dataIndex: 'tokenIn',
      key: 'tokenInSymbol',
      render: (tokenIn) => (
        <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
          <img
            src={tokenIcons[tokenIn.symbol]}
            alt={tokenIn.symbol}
            style={{ width: '20px', height: '20px', marginRight: '8px', verticalAlign: 'middle' }}
          />
          {tokenIn.symbol}
        </div>
      ),
    },
    {
      title: 'Sell Amount',
      dataIndex: 'amountIn',
      key: 'sellAmount',
      render: (amountIn, record) => (
        <>
          {formatTokenAmount(amountIn, record.tokenIn.decimals)}
        </>
      ),
    },
    {
      title: 'Buy',
      dataIndex: 'tokenOut',
      key: 'tokenOutSymbol',
      render: (tokenOut) => (
        <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
          <img
            src={tokenIcons[tokenOut.symbol]}
            alt={tokenOut.symbol}
            style={{ width: '20px', height: '20px', marginRight: '8px', verticalAlign: 'middle' }}
          />
          {tokenOut.symbol}
        </div>
      ),
    },
    {
      title: 'Buy Amount',
      dataIndex: 'minAmountOut',
      key: 'buyAmount',
      render: (minAmountOut, record) => (
        <>
          {formatTokenAmount(minAmountOut, record.tokenOut.decimals)}
        </>
      ),
    },
    {
      title: 'Result',
      dataIndex: 'finalAmountOut',
      key: 'finalAmountOut',
      render: (finalAmountOut, record) => {
        if (record.status === 'filled') {
          return formatTokenAmount(finalAmountOut, record.tokenOut.decimals);
        } else if (record.status === 'canceled') {
          return 'Canceled';
        } else {
          return (
            <Button color="primary" variant="filled" onClick={() => handleCancelOrder(record.orderId)}>
              Cancel Order
            </Button>
          );
        }
      },
    },
  ];

  return (
    <div style={{ marginTop: '20px' }}>
      <Title level={2}>Order History</Title>
      {isLoading ? (
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
      ) : (
        <Table
          dataSource={orderHistory}
          columns={columns}
          rowKey={(record) => record.orderId.toString()}
          pagination={{ pageSize: 10 }}
          sortDirections={['descend', 'ascend']}
        />
      )}
    </div>
  );
};

export default OrderHistory;
