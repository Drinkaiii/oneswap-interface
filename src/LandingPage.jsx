import React, { useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, Button } from 'antd';
import { SwapOutlined, DollarOutlined, SafetyOutlined, GithubOutlined, MailOutlined } from '@ant-design/icons';
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
      if (scrollElement && listElement) {
        if (scrollElement.scrollLeft >= listElement.scrollWidth / 2) {
          scrollElement.scrollLeft = 0; // Reset the scroll position
        } else {
          scrollElement.scrollLeft += scrollSpeed; // Incrementally scroll
        }
        animationId = requestAnimationFrame(animate); // Continue animation
      }
    };
  
    if (scrollElement && listElement) {
      animationId = requestAnimationFrame(animate); // Start animation
    }
  
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId); // Cleanup on unmount
      }
    };
  }, []);

  return (
    <div className="landing-page">
      <header className="landing-header">
        <h1 className="landing-title">Oneswap</h1>
        <Link to="/swap" className="launch-button ant-btn ant-btn-primary">Launch App</Link>
      </header>

      <main className="landing-main">
        <section className="hero-section">
          <div className="hero-background"></div>
          <div className="hero-content">
            <h2 className="hero-title">One Stop DEX Aggregator</h2>
            <p className="hero-description">Get the best rates across mutli DEX for ETH, WBTC, USDT, and more.</p>
            <Button
              className="cta-button"
              type="primary"
              onClick={() => navigate('/swap')}
              icon={<SwapOutlined />}
              size="large"
            >
              Start Trading
            </Button>
          </div>
        </section>

        <section className="supported-tokens-section">
          <h3 className="section-title">Supported Tokens</h3>
          <div className="token-scroll-container">
            <div className="token-list">
              {[...tokens, ...tokens].map((token, index) => (
                <div key={index} className="token-item">
                  <img className="token-image" src={token.image} alt={token.symbol} />
                  <span className="token-symbol">{token.symbol}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="benefits-section">
          <div className="benefit-item">
            <SwapOutlined className="benefit-icon" />
            <h3 className="benefit-title">Connect Wallet</h3>
            <p className="benefit-description">Securely connect your crypto wallet to start trading</p>
          </div>
          <div className="benefit-item">
            <DollarOutlined className="benefit-icon" />
            <h3 className="benefit-title">Choose Tokens</h3>
            <p className="benefit-description">Select from a wide range of cryptocurrencies including ETH, WBTC, USDT, and ZYDB</p>
          </div>
          <div className="benefit-item">
            <SafetyOutlined className="benefit-icon" />
            <h3 className="benefit-title">Sign Transaction</h3>
            <p className="benefit-description">Confirm and sign your transaction for instant or limit order trades</p>
          </div>
        </section>

        <section className="testimonial-section">
          <h2 className="section-title">What our customers say</h2>
          <blockquote className="testimonial-quote">
            "Oneswap made trading across different DEXes so much easier. I always get the best rates!"
          </blockquote>
          <div className="testimonial-author">
            <Avatar src="/path-to-avatar.jpg" size={64} className="author-avatar" />
            <div className="author-info">
              <p className="author-name">Jane Doe</p>
              <div className="author-rating">⭐⭐⭐⭐⭐</div>
            </div>
          </div>
        </section>

        <section className="community-section">
          <h2 className="section-title">Join our community</h2>
          <div className="community-image">
            <img src="/community.gif" alt="Join our community" />
          </div>
          <div className="social-links">
            <a href="https://" target="_blank" rel="noopener noreferrer">
              <img src="/x.png" alt="Twitter" className="social-icon" />
              <span>Twitter</span>
            </a>
            <a href="https://discord.gg/yourserver" target="_blank" rel="noopener noreferrer">
              <img src="/discord.svg" alt="Discord" className="social-icon" />
              <span>Discord</span>
            </a>
            <a href="https://github.com/yourorganization" target="_blank" rel="noopener noreferrer">
              <GithubOutlined />
              <span>GitHub</span>
            </a>
            <a href="mailto:contact@yourproject.com">
              <MailOutlined />
              <span>Email</span>
            </a>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p className="footer-text">&copy; 2024 Oneswap. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;