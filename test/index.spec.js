const {web3, evm} = require('./util/web3');
const sources = {Token: require('../dist/token.json')};
const {getContracts, getAccounts} = require('../util/web3');

const {toWei, fromWei} = web3.utils;

module.exports = (test) => {
  test.define(() => {
    return {
      web3,
      evm,
      toWei: web3.utils.toWei,
      fromWei: web3.utils.fromWei,
      getBalance: (address, units = 'ether') => web3.eth.getBalance(address)
      .then((balance) => web3.utils.fromWei(balance, units)),
    };
  });

  test.define(async ({web3}) => {
    accounts = await getAccounts(web3, [
      'main',
      'member1',
      'member2',
      'member3',
      'member4',
      'user1',
      'user2',
      'user3',
      'user4',
    ]);

    contracts = await getContracts(web3, {
      token: sources.Token,
    });

    return {contracts, accounts};
  });

  require('./token.spec')(test);
};
