const chalk = require('chalk');
const path = require('path');

let lineLength = 80;
if (process.stdout.isTTY) {
  lineLength = process.stdout.getWindowSize()[0];
}

function cutline(text, length) {
  const line = text.slice(0, length);
  const rn = line.match(/\r|\r?\n/);
  if (rn) {
    return line.slice(0, rn.index + rn[0].length);
  }
  else if (line.length === length) {
    const space = line.match(/\s+(?=\S*$)/);
    if (space) {
      return line.slice(0, space.index + 1);
    }
  }

  return line;
}

function wordwrap(text, length, prefix, skip = 0) {
  const indent = prefix.length;
  const out = [];

  while(text.length) {
    let maxLength = skip > 0 ? length : length - indent;
    let linePrefix = skip > 0 ? '' : prefix;

    let line = cutline(text, maxLength);

    text = text.slice(line.length);
    out.push(linePrefix + line.trimEnd());
  }

  return out.join('\n');
}

function defaultReporter(item, error, {dir}) {
  const prefix = '  ';
  const {number, path} = item;

  let status;
  let title = (item.title || item.type);
  let location = chalk.gray('# ' + path.join(' :: '));
  let msg;

  if (error) {
    status = chalk.bold.red('not ok');

    if (error.assertion) {
      msg = toYamlLike({
        message: error.message,
        operator: error.assertion.params.operator,
        actual: error.assertion.params.actual,
        expected: error.assertion.params.expected,
        location: error.location,
      }, {dir});
    }
    else {
      msg = toYamlLike({
        message: error.message,
        location: error.location,
      }, {dir});
    }
  }
  else if (item.type === 'case') {
    status = chalk.bold.green('ok');
  }
  else {
    return;
  }

  console.log(wordwrap(location, lineLength, prefix, 1));
  console.log(wordwrap(`${status} ${number} - ${title}`, lineLength, prefix, 1));
  if (msg) {
    console.log(wordwrap(`---\n${msg}\n...`, lineLength, prefix));
  }
}

function isEscapeable(value) {
  return /^(\s|\w)+$/.test(value) === false;
}

function escape(value) {
    return "'" + value.replace(/\\/g, '\\\\')
    .replace(/'/g, '\\\'') + "'";
}

function safeValue(value) {
  const _value = String(value);
    if (! isEscapeable(_value)) {
      return value;
    }

    return escape(_value);
}

function toYamlLike(values, {indent = 0, dir} = {}) {
  const keys = Object.getOwnPropertyNames(values);
  const maxLength = keys.reduce((result, key) => Math.max(result, key.length), 0);
  const out = [];
  const prefix = ' '.repeat(indent);
  for (const key of keys) {
    const space = ' '.repeat(maxLength - key.length);
    const value = values[key];
    const coloredKey = chalk.grey(key + ':');
    if (Array.isArray(value)) {
      out.push(`${prefix}${coloredKey}`);
      value.forEach((item) => {
        if (! item.startsWith(dir + path.sep)) {
          item = chalk.gray(safeValue(item));
        }
        else {
          item = safeValue(item);
        }
        out.push(`${prefix}  - ${item}`);
      });
    }
    else {
      out.push(`${prefix}${coloredKey} ${space}${safeValue(value)}`);
    }
  }
  return out.join('\n');
}

function createSection(title, path, ctx) {
  return {
    type: 'section',
    title,
    ctx: Object.create(ctx),
    actions: [],
    path,
  };
}

function createRunner({
  context = {},
  reporter = defaultReporter,
  cwd,
  dir,
} = {}) {
  let total = 0;

  return (handler) => {
    let section = createSection('', [], context);

    const levers = {
      describe(title, handler) {
        const next = createSection(title, [...section.path, title], section.ctx);
        section.actions.push(next);
        const tmp = section;
        section = next;
        handler(levers);
        section = tmp;
      },
      define(handler) {
        const {ctx} = section;

        section.actions.push({
          type: 'define',
          path: section.path,
          handler: async () => {
            Object.assign(ctx, await handler(ctx));
          },
        });
      },
      before(handler) {
        const {ctx} = section;

        section.actions.push({
          type: 'before',
          path: section.path,
          handler: () => handler(ctx),
        });
      },
      after(handler) {
        const {ctx} = section;

        section.actions.push({
          type: 'after',
          path: section.path,
          handler: async () => {
            Object.assign(ctx, await handler(ctx));
          },
        });
      },
      it(title, ...handlers) {
        const {ctx} = section;

        section.actions.push({
          type: 'case',
          title,
          number: ++total,
          path: section.path,
          handler: async () => {
            while(handlers.length) {
              await handlers.shift()(ctx);
            }
          },
        });
      },
    };

    handler(levers);

    const {prepareStackTrace} = Error;
    const tapeStackTrace = (error, trace) => {
      const string = prepareStackTrace(error, trace);

      const location =  [...trace.map((item) => {
        const filename = path.relative(cwd, item.getFileName() || '.');
        const line = `${filename}:${item.getLineNumber()}:${item.getColumnNumber()}`;
        return line;
      })];
      error.location = location;
      return string;
    };

    let pass = 0;
    const report = (item) => (error) => {
        if (item.type === 'case' && ! error) {
          pass += 1;
        }
        if (error) {
          error.stack;
        }
        reporter(item, error, {dir});
    };

    const interrupt = (item) => (error) => {
      let msg = 'Bail out!';
      msg += ' ' + (item.title || item.type) + ' at ' + item.path.join(' / ') + '\n';
      if (error) {
        msg += error.stack;
      }
      console.log('\n' + msg);
      process.exit(1);
    };

    const wrapped = (item, promise) => {
      return promise.catch(interrupt(item));
    };

    const wrappedIt = (item, promise) => {
      return promise.then(report(item), report(item));
    };

    // Overwrite prepareStackTrace
    Error.prepareStackTrace = tapeStackTrace;

    console.log('TAP version 13');
    console.log('1..%s\n', total);
    return walk(section, {
      describe(item, fn) {
        return fn().catch(interrupt(item));
      },
      define(item ) {
        const {handler, ctx} = item;
        return wrapped(item, handler(ctx));
      },
      before(item) {
        const {handler, ctx} = item;
        return wrapped(item, handler(ctx));
      },
      after(item) {
        const {handler, ctx} = item;
        return wrapped(item, handler(ctx));
      },
      it(item) {
        const {handler, ctx} = item;
        return wrappedIt(item, handler(ctx));
      },
    })
    .finally(() => {
      // Restore prepare stack trace
      Error.prepareStackTrace = prepareStackTrace;

      const fail = total - pass;
      console.log('');
      console.log('# tests: %s', chalk.bold(total));
      console.log('# pass: %s', chalk.bold(pass));
      console.log('# fail: %s', chalk.bold(fail));
      console.log('# rate: %s %', chalk.bold((pass / total * 100).toFixed(2)));
    })
    .then(() => ({total, pass}));
  };
}

const order = {
    define: 1,
    before: 1,
    case: 6,
    section: 5,
    after: 10,
};

async function walk(section, test) {
  const actions = section.actions.slice()
  .sort((a, b) => order[a.type] - order[b.type]);

  for (const item of actions) {
    switch (item.type) {
      case 'section': {
        await test.describe(item, () => walk(item, test));
        break;
      }
      case 'define':
      case 'before': {
        await test.before(item);
        break;
      }
      case 'after': {
        await test.after(item);
        break;
      }
      case 'case': {
        await test.it(item);
        break;
      }
    }
  };
}

module.exports = createRunner;
