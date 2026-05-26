const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function compileElectron() {
  console.log('Compiling main and preload scripts...');
  try {
    if (!fs.existsSync(path.join(__dirname, '../dist'))) {
      fs.mkdirSync(path.join(__dirname, '../dist'), { recursive: true });
    }
    // Simple compilation or copy if needed, but since we are compiling ts, let's run tsc.
    // For fast startup in dev, we can compile main.ts and preload.ts.
    const execSync = require('child_process').execSync;
    execSync('npx tsc electron/main.ts electron/preload.ts electron/scanner/worker.ts --outDir dist --target es2022 --module commonjs --skipLibCheck true --moduleResolution node', { stdio: 'inherit' });
  } catch (err) {
    console.error('TypeScript compilation failed:', err);
  }
}

// Compile once at start
compileElectron();

// Spawn Vite Dev Server
const vite = spawn('npx', ['vite'], { shell: true, stdio: 'pipe' });

vite.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('[Vite]', output.trim());
  
  if (output.includes('Local:') || output.includes('localhost:')) {
    console.log('Vite server is ready! Starting Electron...');
    
    const electron = spawn('npx', ['electron', '.'], {
      shell: true,
      stdio: 'inherit',
      env: {
        ...process.env,
        ELECTRON_DEV_URL: 'http://localhost:5173'
      }
    });

    electron.on('close', () => {
      vite.kill();
      process.exit();
    });
  }
});

vite.stderr.on('data', (data) => {
  console.error('[Vite Error]', data.toString());
});
