const { app, BrowserWindow } = require('electron');
const path = require('path');
const os = require('os');
const LogReader = require('./reader');
const playerScout = require('./playerScout')

function makeWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  win.loadFile('index.html');
}

app.whenReady().then(async () => {
  makeWindow();

  // defautling to where lunar client's log files are typically found
  let logs_path = path.join(os.homedir(), '.lunarclient', 'logs', 'game');
  
  // search for latest log file and attach a LogReader
  const log_reader = new LogReader(logs_path);
  await log_reader.init();

  // set up player scout
  playerScout.onPlayerAdded(() => {
    ;
  })
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    makeWindow();
  }
})