const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
  console.log('not enough arguments!');
  process.exit(1);
}

const fileName = process.argv[2];
const contents = fs.readFileSync(fileName, 'utf-8');

const json = JSON.parse(contents);
let foundError = false;

json.forEach((res) => {
  res.messages.forEach((message) => {
    const level = message.severity === 1 ? 'warning' : 'error';
    if (level === 'error') {
      foundError = true;
    }

    const properties = [
      `file=${path.relative(process.cwd(), res.filePath)}`,
      `line=${message.line}`,
      `endLine=${message.endLine || message.line}`,
    ];
    console.log(`::${level} ${properties.join(',')}::ESLINT: ${message.message}`);
  });
});

if (foundError) process.exit(1);
