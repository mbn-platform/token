const path = require('path');
const createRunner = require('./tap');

const file = process.argv[2];
const [files, argv] = splitArgs(process.argv.slice(2));

const cwd = process.cwd();
const dir = path.dirname(path.relative(cwd, file));

createRunner({
  cwd,
  dir,
  context:{argv},
})((test) => {
  for (const file of files) {
    require(path.resolve(file))(test);
  }
})
.then(({total, pass}) => {
  if (total > pass) {
    process.exit(1);
  }
})
.catch(error => {
  console.error(error);
  process.exit(1);
});

function splitArgs(argv, splitter = '--') {
  const index = argv.indexOf(splitter);

  if (index < 0) {
    return [argv,[]];
  }

  return [argv.slice(0, index), argv.slice(index + 1)];
}
