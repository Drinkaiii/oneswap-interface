import React, { useState, useEffect } from 'react';
import { Card, Row, Col } from 'antd';
import { useTransition, animated } from 'react-spring';

const initialData = [
  {
    amountOut: 5761,
    slippage: 0.01,
    liquidity: {
      network: "Sepolia",
      exchanger: "Uniswap",
    }
  },
  {
    amountOut: 5540,
    slippage: 0.01,
    liquidity: {
      network: "Sepolia",
      exchanger: "Balancer",
    }
  }
];

const ExchangeRateList = () => {
  const [data, setData] = useState(initialData);

  // 模擬數據更新
  useEffect(() => {
    const newData = [
      {
        amountOut: 5000,
        slippage: 0.01,
        liquidity: {
          network: "Sepolia",
          exchanger: "Uniswap",
        }
      },
      {
        amountOut: 5600,
        slippage: 0.01,
        liquidity: {
          network: "Sepolia",
          exchanger: "Balancer",
        }
      }
    ];

    setTimeout(() => setData(newData), 3000);
  }, []);

  // 使用 react-spring 的 useTransition 來處理項目動畫過渡
  const transitions = useTransition(
    data.sort((a, b) => b.amountOut - a.amountOut), // 根據 amountOut 排序
    {
      key: item => item.liquidity.exchanger,
      from: { opacity: 0, transform: 'translate3d(0,-20px,0)' },
      enter: { opacity: 1, transform: 'translate3d(0,0,0)' },
      leave: { opacity: 0, transform: 'translate3d(0,-20px,0)' },
      config: { tension: 220, friction: 12 }
    }
  );

  return (
    <div style={{ padding: '20px' }}>
      <Row gutter={16}>
        {transitions((styles, item) => (
          <Col span={24} key={item.liquidity.exchanger}>
            <animated.div style={styles}>
              <Card title={item.liquidity.exchanger}>
                <p><strong>Amount Out:</strong> {item.amountOut.toLocaleString()}</p>
                <p><strong>Slippage:</strong> {(item.slippage * 100).toFixed(2)}%</p>
                <p><strong>Network:</strong> {item.liquidity.network}</p>
              </Card>
            </animated.div>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default ExchangeRateList;
