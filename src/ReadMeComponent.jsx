import React, { useState } from 'react';
import { WarningOutlined, KeyOutlined, InfoCircleOutlined, CheckOutlined } from '@ant-design/icons';
import './ReadMe.css';

const ReadMeComponent = () => {
  const mnemonic = 'vessel issue nature curve intact toast slam broom expose same soft live';
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="readme-container">
      <h1 className="readme-title">Instant Access Instruction</h1>
      <p className="readme-description">
        You can use the test wallet with <strong>OneSwap</strong>. The wallet already contains the required tokens and SepoliaETH. Once setup is complete, you can start trading.
      </p>
      <div className="readme-alert">
        <WarningOutlined />
        <p className="readme-alert-text">
            Here is a recovery phrase for a test wallet, for testing purposes only. Please do not store real assets!
        </p>
      </div>

      <div className="readme-cards">
        {/* Recovery Phrase */}
        <div className="readme-card">
          <div className="readme-card-header">
            <h3 className="readme-card-title">
              <KeyOutlined className="readme-card-icon" />
              Wallet Recovery Phrase
            </h3>
          </div>
          <div className="readme-card-content">
            <div className="readme-info-item">
              <label className="readme-info-label">
                click 12 mnemonic words to copy
              </label>
              <div className="readme-mnemonic-grid">
                {mnemonic.split(' ').map((word, index) => (
                  <button
                    key={index}
                    className={`readme-mnemonic-item ${copiedIndex === index ? 'copied' : ''}`}
                    onClick={() => copyToClipboard(word, index)}
                  >
                    <span className="readme-mnemonic-number">{index + 1}.</span>
                    <span className="readme-mnemonic-word">{word}</span>
                    {copiedIndex === index && (
                      <CheckOutlined className="readme-check-icon" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Instruction */}
        <div className="readme-card">
          <div className="readme-card-header">
            <h3 className="readme-card-title">
              <InfoCircleOutlined className="readme-card-icon" />
              Steps for use
            </h3>
          </div>
          <div className="readme-card-content">
            <ol className="readme-steps">
              <li className="readme-step">Download MetaMask: <a href='https://metamask.io/zh-CN/download/'>Link</a></li>
              <li className="readme-step">Click and copy each mnemonic word.</li>
              <li className="readme-step">In the wallet, select the "Import Wallet" button.</li>
              <li className="readme-step">Enter the 12 mnemonic words in order.</li>
              <li className="readme-step">Switch the wallet network to Sepolia.</li>
              <li className="readme-step">Wallet setup is complete, and you can now send transactions directly.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadMeComponent;