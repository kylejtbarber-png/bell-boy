const fs = require('fs');
const path = require('path');

function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const message = [
    'reset-project: no-op starter script.',
    `Project root: ${projectRoot}`,
    'If you want a real reset, customize scripts/reset-project.js.',
  ].join('\n');

  process.stdout.write(`${message}\n`);

  const markerPath = path.join(projectRoot, '.reset-project-ran');
  try {
    fs.writeFileSync(markerPath, `${new Date().toISOString()}\n`, 'utf8');
  } catch (_err) {
    // ignore
  }
}

main();
