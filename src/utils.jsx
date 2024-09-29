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
