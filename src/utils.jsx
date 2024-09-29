import BigNumber from 'bignumber.js';

// convert to normal unit
export function toNormalUnit(amount, decimals) {
  if (amount === "") return "";
  const bigNumberAmount = BigNumber.isBigNumber(amount) ? amount : new BigNumber(amount);
  const factor = new BigNumber(10).pow(decimals);
  return Number(bigNumberAmount.div(factor).toPrecision(10));
}

// convert to the smallest unit
export function toSmallestUnit(amount, decimals) {
  const bigNumberAmount = BigNumber.isBigNumber(amount) ? amount : new BigNumber(amount);
  const factor = new BigNumber(10).pow(decimals);
  return bigNumberAmount.times(factor);
}

// Fetch token icons from CoinGecko
export const fetchTokenIcons = async (tokens, setTokenIcons) => {
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



// Fetch account balance from worker back-end
export const fetchAccountBalances = async (account, setBalances) => {
  if (!account) {
      console.warn('Wallet not connected');
      return;
    }
    try {
      const response = await fetch(`http://localhost:8080/api/1.0/account/info?address=${account}`);
      const data = await response.json();
      
      const balanceMap = {};
      data.forEach(token => {
        const balance = new BigNumber(token.balance, 16);
        balanceMap[token.tokenAddress.toLowerCase()] = {
          balance: balance,
          decimals: token.decimals
        };
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error('Error fetching account balances:', error);
    }
};
