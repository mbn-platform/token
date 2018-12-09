const ganache = require('ganache-cli');
const Web3 = require('web3');
const dayjs = require('dayjs');

// Create web3 instance
const provider = ganache.provider({
  total_accounts: 100,
  default_balance_ether: 1000,
  time: dayjs('1971-01-01').startOf('day').toDate(),
});
provider.setMaxListeners(0);

const web3 = new Web3(provider);

const snapshots = [];

function snapshot() {
  return evmCall('evm_snapshot')
  .then((result) => {
    snapshots.push(result);
  });
}

function rollback() {
  return evmCall('evm_revert', [snapshots.pop()]);
}

function increaseTime(amount) {
  return evmCall('evm_increaseTime', [amount]);
}

function evmCall(method, params = []) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: '2.0',
      method,
      params,
      id: new Date().getTime()
    }, (err, out) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(out.result);
      }
    });
  });
}

exports.web3 = web3;
exports.evm = {snapshot, rollback, increaseTime};
