const createContract = require('./web3-contract');

// Deploy contract
async function deployContract(web3, contract, args = [], {from, ...options}) {
  const block = await web3.eth.getBlock('latest');
  const Contract = new web3.eth.Contract(contract.abi, {
    gas: block.gasLimit,
    ...options,
    from,
  });

  return Contract.deploy({
    data: '0x' + contract.evm.bytecode.object,
    arguments: args,
  })
  .send({
    from,
    ...options,
  });
}

// Associate accounts with passed names
async function getAccounts(web3, names, defaultName = 'other') {
  const all = await web3.eth.getAccounts();

  return all.reduce((result, address, i) => ({
    ...result,
    [names[i] || defaultName + i]: all[i],
  }), {});
}

function getContract(web3, contract) {
  if (contract.evm && ! contract.evm.bytecode.object.length) {
    throw new Error(`Invalid contract "${name}" descriptor`);
  }

  let deploy;

  if (contract.evm) {
    deploy = function (...callArgs) {
      return {
        send(...args) {
          let opts;
          if (typeof args[0] === 'string') {
            opts = {from: args[0]};
          }
          else {
            opts = args[0];
          }

          return deployContract(web3, contract, callArgs, opts);
        },
      }
    };
  }

  const at = function(address) {
    return createContract(web3, contract.abi, address);
  };

  return {
    deploy,
    at,
  };
}

async function getContracts(web3, contracts) {
  return Object.getOwnPropertyNames(contracts)
  .reduce((result, name) => ({
    ...result,
    [name]: getContract(web3, contracts[name]),
  }), {});
}

exports.deployContract = deployContract;
exports.getAccounts = getAccounts;
exports.getContracts = getContracts;
