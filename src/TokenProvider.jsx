import React, { createContext, useState, useEffect, useContext } from 'react';

const TokenContext = createContext();

export const useTokens = () => useContext(TokenContext);

export const TokenProvider = ({ children }) => {
  const [tokenIcons, setTokenIcons] = useState({});
  const [loading, setLoading] = useState(true);
  const [availableTokens, setAvailableTokens] = useState([
    { symbol: 'ETH', code: 'ethereum', decimals: 18, address: "0xa3127E9B960DA8E7b297411728Def559bCaDf9c4" },
    { symbol: 'WBTC', code: 'wrapped-bitcoin', decimals: 18, address: "0xdE43B354d506Ce213C4bE70B750b5c6AcC09D7CA"},
    { symbol: 'USDT', code: 'tether', decimals: 18, address: "0x9a34950F069fFB4FD58bbE906f0C36A4c51AAf00" },
    { symbol: 'ZYDB', code: 'zydb', decimals: 18, address: "0xab0b42Ac6ec6B9B29E55Ba7991887f4C374d2407" }
  ]);

  useEffect(() => {
    fetchTokenIcons(availableTokens, (icons) => {
      setTokenIcons(icons);
      setLoading(false);
    });
  }, []);

  // Fetch token icons from CoinGecko
  const fetchTokenIcons = async (tokens, setTokenIcons) => {
    const defaultIconUrl = '/question.svg';
    try {
      const ids = tokens.map(token => token.code).join(',');
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}`
      );
      const data = await response.json();
      const icons = {};

      tokens.forEach(token => {
        const tokenData = data.find(item => item.id === token.code);
        if (tokenData && tokenData.image) {
          icons[token.symbol.toUpperCase()] = tokenData.image;
        } else {
          icons[token.symbol.toUpperCase()] = defaultIconUrl;
        }
      });

      setTokenIcons(icons);
    } catch (error) {
      console.error('Error fetching token icons:', error);
    }
  };

  return (
    <TokenContext.Provider value={{ tokenIcons, loading, availableTokens }}>
      {children}
    </TokenContext.Provider>
  );
};