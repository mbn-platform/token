const web3 = require('web3');

// Ethereum handlers
exports.ether = (v) => web3.utils.toWei(String(v), 'ether');

// TAP helpers
function snapshot(ctx) {
  return ctx.evm.snapshot();
}

function rollback(ctx) {
  return ctx.evm.rollback();
}

exports.snapshot = snapshot;
exports.rollback = rollback;

exports.wrap = (fn) => async (ctx) => {
  await snapshot(ctx);
  try {
    await fn(ctx);
  }
  finally {
    await rollback(ctx);
  }
};

// Other
exports.stack = function(...fns) {
  return (arg) => {
    for (const fn of fns) {
      fn(arg);
    }
  };
};

function checkThrown(err, check) {
  if (typeof check === 'function') {
    return check(err);
  }
  else if (check instanceof RegExp){
    return check.test(err.message);
  }
  else {
    return check === err.message;
  }
}
async function throws(check, fn) {
  try {
    await fn();
  }
  catch (err) {
    if (checkThrown(err, check)) {
      return true;
    }
    else {
      throw err;
    }
  }
  return false;
}

// Test throws capture
exports.throws = throws;
