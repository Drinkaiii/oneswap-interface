// WalletProvider.js
import React, { createContext, useState, useEffect } from 'react';
import Web3 from 'web3';

// 建立 Context
export const WalletContext = createContext();

const WalletProvider = ({ children }) => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // 連接 MetaMask
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const web3Instance = new Web3(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await web3Instance.eth.getAccounts();
        setWeb3(web3Instance);
        setAccount(accounts[0]); // 設置第一個帳戶
      } catch (error) {
        setErrorMessage('Failed to connect wallet.');
        console.error(error);
      }
    } else {
      setErrorMessage('Please install MetaMask.');
    }
  };

  // 當帳戶變更時更新狀態
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts[0]);
      });
    }
  }, []);

  return (
    <WalletContext.Provider value={{ web3, account, connectWallet, errorMessage }}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletProvider;
