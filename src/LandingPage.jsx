import React, { useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, Button } from 'antd';
import { SwapOutlined, DollarOutlined, SafetyOutlined } from '@ant-design/icons';
import './LandingPage.css';

const tokens = [
  { symbol: 'ETH', image: '/ethereum.webp' },
  { symbol: 'BTC', image: '/bitcoin.webp' },
  { symbol: 'USDT', image: 'Tether.webp' },
  { symbol: 'USDC', image: '/usdc.webp' },
  { symbol: 'DAI', image: '/Dai.webp' },
  { symbol: 'BNB', image: '/bnb.webp' },
  { symbol: 'Avalanche', image: '/Avalanche.webp' },
  { symbol: 'Aave', image: '/aave.webp' },
  { symbol: 'Bitcoin Cash', image: '/bitcoin-cash.webp' },
  { symbol: 'Chainlink', image: '/chainlink.webp' },
  { symbol: 'ImmutableX', image: '/immutableX.webp' },
  { symbol: 'Optimism', image: '/Optimism.webp' },
];

const LandingPage = () => {
  const scrollRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const scrollElement = scrollRef.current;
    const listElement = listRef.current;
    let animationId;
    const scrollSpeed = 1; // Speed of scroll in pixels

    const animate = () => {
      if (scrollElement.scrollLeft >= listElement.scrollWidth / 2) {
        scrollElement.scrollLeft = 0; // Reset the scroll position
      } else {
        scrollElement.scrollLeft += scrollSpeed; // Incrementally scroll
      }
      animationId = requestAnimationFrame(animate); // Continue animation
    };

    animationId = requestAnimationFrame(animate); // Start animation

    return () => cancelAnimationFrame(animationId); // Cleanup on unmount
  }, []);

  return (
    <div className="landing-page">
      <header>
        <h1>Oneswap</h1>
        <Link to="/swap" className="launch-button">Launch App</Link>
      </header>

      <main>
      <section className="hero">
          <div className="hero-content">
            <h2>One-Stop DEX Aggregator</h2>
            <p>Get the best rates across mutli DEX for ETH, WBTC, USDT, and more.</p>
            <Button
              type="primary"
              onClick={() => navigate('/swap')}
              icon={<SwapOutlined />}
              size="large"
              className="cta-button"
            >
              Start Trading
            </Button>
          </div>
        </section>

        <section className="supported-tokens">
          <h3>Supported Tokens</h3>
            <div className="token-scroll-container">
              <div className="token-list">
                {[...tokens, ...tokens].map((token, index) => (
                  <div key={index} className="token-item">
                    <img src={token.image} alt={token.symbol} />
                    <span>{token.symbol}</span>
                  </div>
                ))}
              </div>
            </div>
        </section>

        <section className="benefits">
          <div className="benefit-item">
            <SwapOutlined className="benefit-icon" />
            <h3>Connect Wallet</h3>
            <p>Securely connect your crypto wallet to start trading</p>
          </div>
          <div className="benefit-item">
            <DollarOutlined className="benefit-icon" />
            <h3>Choose Tokens</h3>
            <p>Select from a wide range of cryptocurrencies including ETH, WBTC, USDT, and ZYDB</p>
          </div>
          <div className="benefit-item">
            <SafetyOutlined className="benefit-icon" />
            <h3>Sign Transaction</h3>
            <p>Confirm and sign your transaction for instant or limit order trades</p>
          </div>
        </section>

        <section className="testimonial">
          <h3>What our customers say</h3>
          <blockquote>
            "Oneswap made trading across different DEXes so much easier. I always get the best rates!"
          </blockquote>
          <div className="testimonial-author">
            <Avatar src="/path-to-avatar.jpg" size={64} className="avatar" />
            <div>
              <p>Jane Doe</p>
              <div className="rating">⭐⭐⭐⭐⭐</div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <p>&copy; 2024 Oneswap. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;