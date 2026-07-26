const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Check if backend is responding
  const checkBackend = () => {
    const port = process.env.PORT || 5000;
    http.get(`http://localhost:${port}/api/health`, (res) => {
      if (res.statusCode === 200) {
        mainWindow.loadURL(`http://localhost:${port}`);
      } else {
        setTimeout(checkBackend, 1000);
      }
    }).on('error', () => {
      setTimeout(checkBackend, 1000);
    });
  };

  setTimeout(checkBackend, 1000);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startBackend() {
  // Spawn the compiled backend
  const backendEntry = path.join(__dirname, 'backend', 'dist', 'index.js');
  
  // Start backend process
  backendProcess = spawn('node', [backendEntry], {
    env: { ...process.env, PORT: process.env.PORT || 5000 },
    cwd: path.join(__dirname, 'backend'), // Set cwd so Prisma client resolves properly
    stdio: 'inherit'
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend process:', err);
  });
}

app.on('ready', () => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    if (backendProcess) {
      backendProcess.kill();
    }
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('will-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
