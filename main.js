const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow;
let backendStartupError = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const loadingHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            background-color: #0f172a;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .spinner {
            width: 44px;
            height: 44px;
            border: 4px solid rgba(255,255,255,0.1);
            border-left-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          h2 { margin: 0 0 8px 0; font-size: 22px; font-weight: 600; }
          p { margin: 0; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <h2>Anshika Enterprises</h2>
        <p>Starting server and connecting...</p>
      </body>
    </html>
  `;
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(loadingHtml)}`);

  const port = process.env.PORT || 5000;
  let attempts = 0;
  const maxAttempts = 60; // 30 seconds timeout
  let isLoaded = false;

  const checkBackend = () => {
    attempts++;
    http.get(`http://localhost:${port}/api/health`, (res) => {
      if (res.statusCode === 200 && !isLoaded) {
        isLoaded = true;
        mainWindow.loadURL(`http://localhost:${port}`);
      } else if (!isLoaded) {
        if (attempts < maxAttempts) {
          setTimeout(checkBackend, 500);
        } else {
          showErrorPage(`Backend server returned HTTP ${res.statusCode}`);
        }
      }
    }).on('error', (err) => {
      if (!isLoaded) {
        if (attempts < maxAttempts) {
          setTimeout(checkBackend, 500);
        } else {
          showErrorPage(`Connection failed: ${err.message}`);
        }
      }
    });
  };

  const showErrorPage = (errMsg) => {
    let detailMsg = errMsg;
    if (backendStartupError) {
      detailMsg += `<br><br><div style="text-align:left; background:#020617; color:#f87171; padding:12px; border-radius:6px; font-family:monospace; font-size:12px; overflow:auto; max-height:220px; word-break:break-all;"><b>Startup Error:</b><br>${backendStartupError.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
    }
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              background-color: #0f172a;
              color: #f8fafc;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
              text-align: center;
            }
            .error-box {
              background-color: #1e293b;
              border: 1px solid #334155;
              border-radius: 12px;
              padding: 32px;
              max-width: 650px;
              width: 100%;
              box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            }
            h2 { color: #f87171; margin-top: 0; }
            p { color: #cbd5e1; font-size: 14px; word-break: break-word; }
            button {
              margin-top: 20px;
              padding: 10px 24px;
              background-color: #2563eb;
              color: white;
              border: none;
              border-radius: 6px;
              font-weight: 600;
              cursor: pointer;
            }
            button:hover { background-color: #1d4ed8; }
          </style>
        </head>
        <body>
          <div class="error-box">
            <h2>Backend Server Connection Failed</h2>
            <p>${detailMsg}</p>
            <button onclick="location.reload()">Retry Connection</button>
          </div>
        </body>
      </html>
    `;
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
  };

  checkBackend();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startBackend() {
  try {
    const backendEntry = path.join(__dirname, 'backend', 'dist', 'index.js');
    console.log('Starting backend inside main process from:', backendEntry);
    require(backendEntry);
    console.log('Backend started successfully.');
  } catch (err) {
    backendStartupError = err.stack || err.toString();
    console.error('Failed to start backend in main process:', err);
  }
}

app.on('ready', () => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});



