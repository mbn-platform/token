const fs = require('fs');
const path = require('path');
const solc = require('solc');
const globby = require('globby');
const chalk = require('chalk');

const ch = new chalk.constructor({
  enabled: true,
  level: 1,
});

const defaultSettings = {
  optimizer: {
    // disabled by default
    enabled: false,
    // Optimize for how many times you intend to run the code.
    // Lower values will optimize more for initial deployment cost, higher values will optimize more for high-frequency usage.
    runs: 200
  },
  outputSelection: {
    '*': {
      '*': [
        'abi',
        'devdoc',
        'userdoc',
        'evm.libraries',
        'evm.bytecode',
        // 'evm.bytecode.object',
        // 'evm.bytecode.linkReferences',
        'evm.deployedBytecode',
        'evm.methodIdentifiers',
        'evm.gasEstimates',
      ],
    },
  },
};

async function compile(mainFile, contract, format = 'RAW', outputSettings) {
  const files = await globby([
    '**/*.sol',
    '!test',
    '!tmp',
  ]);

  const fileMap = createFileMap(files);

  let settings;
  if (outputSettings) {
    settings = {'*': {'*': outputSettings}};
  }
  if (fs.existsSync('solc.json')) {
    settings = JSON.parse(fs.readFileSync('solc.json'));
  }
  else {
    settings = defaultSettings;
  }

  const compilerOptions = {
    language: 'Solidity',
    sources: {
      [mainFile]: {
        content: fileMap[mainFile],
      },
    },
    settings,
  };

  const loader = (filepath, ...args) => {
    if (fileMap.hasOwnProperty(filepath)) {
      return {contents: fileMap[filepath]};
    }

    if (fs.existsSync(path.join('node_modules', filepath))) {
      return {contents: fs.readFileSync(path.join('node_modules', filepath), 'utf8')}
    }

    return {error: `File "${filepath}" not found`};
  };

  const output = compileStandard(compilerOptions, loader);

  let errors = [];
  let result;

  if ('errors' in output) {
    errors = output.errors;
  }

  if (output.contracts && output.contracts.hasOwnProperty(mainFile)) {
    if (contract) {
      result = present(format, output.contracts[mainFile][contract]);
    }
    else {
      result = present(format, output.contracts[mainFile]);
    }
  }

  return {errors, result};
}

function compileStandard(compilerOptions, loader) {
  return JSON.parse(
    solc.compileStandard(JSON.stringify(compilerOptions), loader)
  );
}

function createFileMap(files) {
  const cache = {};

  const fileMap = files.reduce((result, file) => {
    Object.defineProperty(result, file, {
      get() {
        if (! cache.hasOwnProperty(file)) {
          cache[file] = fs.readFileSync(file, 'utf8');
        }

        return cache[file];
      },
    });

    return result;
  }, {});

  return fileMap;
}

function present(format, output) {
  switch (format.toUpperCase()) {
  case 'JSON':
    return JSON.stringify(output);
  case 'PRETTY':
    return JSON.stringify(output, null, 2);
  case 'RAW':
  defalt:
    return output;
  }
}

async function main(argv) {
  const [,,src, contract, output = null] = argv;

  const {errors, result} = await compile(src, contract, process.env.FMT, output ? output.split(',') : null);

  if (errors.length) {
    let hasError = false;
    errors.forEach(({severity, formattedMessage}) => {
      let color;
      if (severity === 'error') {
        color = 'red';
        hasError = true;
      }
      else {
        color = 'yellow';
      }

      console.error('[%s]: %s', ch[color](severity.toUpperCase()), formattedMessage);
    });

    if (hasError) {
      return 1;
    }
  }

  console.log(result);
}

main(process.argv)
.catch((error) => {
  console.error(error);
  return 1;
})
.then((code = 0) => process.exit(code));
