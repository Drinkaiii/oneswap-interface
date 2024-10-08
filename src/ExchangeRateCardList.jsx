import React, { useEffect, useState } from 'react';
import { Card, Typography, List } from 'antd';
import { useTransition, animated } from 'react-spring';
import { formatTokenAmount } from './utils';

// 導入圖片
import uniswapLogo from '/Uniswap_logo_pink.svg';
import balancerLogo from '/balancer-logo-black.svg';
import defaultLogo from '/question.svg';

const { Title, Text } = Typography;

const AnimatedCard = animated(Card);

// 獲取交易所 logo 的函數
const getExchangeLogo = (exchangerName) => {
  switch (exchangerName.toLowerCase()) {
    case 'uniswap':
      return uniswapLogo;
    case 'balancer':
      return balancerLogo;
    default:
      return defaultLogo;
  }
};

const ExchangeRateCardList = ({ estimateResponse, onSelectExchange, selectedIndex }) => {
  const [sortedData, setSortedData] = useState([]);

  useEffect(() => {
    if (estimateResponse?.data) {
      const newSortedData = [...estimateResponse.data].sort((a, b) => 
        parseFloat(b.amountOut) - parseFloat(a.amountOut)
      );
      setSortedData(newSortedData);
    }
  }, [estimateResponse]);

  const transitions = useTransition(sortedData, {
    keys: (item, index) => index,
    from: { opacity: 0, transform: 'translate3d(-100%,0,0)' },
    enter: { opacity: 1, transform: 'translate3d(0%,0,0)' },
    leave: { opacity: 0, transform: 'translate3d(-100%,0,0)' },
    update: { opacity: 1, transform: 'translate3d(0%,0,0)' },
    config: { tension: 220, friction: 20 }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {transitions((style, item, _, index) => (
        <AnimatedCard
          style={{
            ...style,
            marginBottom: 16,
            borderLeft: index === selectedIndex ? '4px solid #ef476f' : '1px solid #d9d9d9',
            cursor: 'pointer'
          }}
          styles={{
            body: {
              padding: '16px 24px',
            }
          }}
          onClick={() => onSelectExchange(index)}
          hoverable
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img 
                src={getExchangeLogo(item.liquidity.exchanger)} 
                alt={`${item.liquidity.exchanger} logo`}
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  marginRight: '12px',
                  objectFit: 'contain'
                }} 
              />
              <Title level={4} style={{ margin: 0 }}>
                {item.liquidity.exchanger}
                {index === 0 && <span style={{ color: '#ef476f', marginLeft: '8px' }}>★</span>}
              </Title>
            </div>
            <Text type="secondary">{item.liquidity.network}</Text>
          </div>
          <List
            size="small"
            split={false}
            dataSource={[
              { label: 'Estimate Amount', value: `${formatTokenAmount(item.amountOut, item.liquidity.decimals1)}` },
              { label: 'Slippage', value: `${(parseFloat(item.slippage) * 100).toFixed(2)}%` },
              { label: 'Algorithm', value: item.liquidity.algorithm },
            ]}
            renderItem={listItem => (
              <List.Item style={{ padding: '4px 0' }}>
                <Text strong>{listItem.label}:</Text>
                <Text>{listItem.value}</Text>
              </List.Item>
            )}
          />
        </AnimatedCard>
      ))}
    </div>
  );
};

export default ExchangeRateCardList;