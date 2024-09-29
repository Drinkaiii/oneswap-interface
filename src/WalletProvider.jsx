import React, { createContext, useState, useEffect } from 'react';
import Web3 from 'web3';

// Create Context
export const WalletContext = createContext();

const WalletProvider = ({ children }) => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Connect to MetaMask
  const connectWallet = async () => {
    if (!account && window.ethereum) {
      try {
        const web3Instance = new Web3(window.ethereum);

        // Set the polling interval (e.g., 15 seconds)
        if (web3Instance.currentProvider && typeof web3Instance.currentProvider !== 'string') {
          web3Instance.currentProvider.pollingInterval = 15000;
        }

        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await web3Instance.eth.getAccounts();
        setWeb3(web3Instance);
        setAccount(accounts[0]); // Set the first account
      } catch (error) {
        setErrorMessage('Failed to connect wallet.');
        console.error(error);
      }
    } else if (!window.ethereum) {
      setErrorMessage('Please install MetaMask.');
    }
  };

  // Initialize Web3 and account
  useEffect(() => {
    if (window.ethereum) {
      const web3Instance = new Web3(window.ethereum);

      // Set the polling interval
      if (web3Instance.currentProvider && typeof web3Instance.currentProvider !== 'string') {
        web3Instance.currentProvider.pollingInterval = 15000;
      }

      web3Instance.eth
        .getAccounts()
        .then((accounts) => {
          if (accounts.length > 0) {
            setWeb3(web3Instance);
            setAccount(accounts[0]);
          }
        })
        .catch((error) => {
          setErrorMessage('Failed to initialize wallet.');
          console.error(error);
        });

      // Update state when accounts change
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null); // No accounts connected
        }
      });

      // Handle chain changes
      window.ethereum.on('chainChanged', (chainId) => {
        console.log('Network changed to:', chainId);
        window.location.reload(); // Reload the page on chain change
      });

      return () => {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      };
    } else {
      setErrorMessage('Please install MetaMask.');
    }
  }, []);

  return (
    <WalletContext.Provider value={{ web3, account, connectWallet, errorMessage }}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletProvider;
