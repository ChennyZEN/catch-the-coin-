const { app, BrowserWindow } = require("electron");
const path = require("path");

// Una sola finestra alla volta
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  let win = null;

  function createWindow() {
    win = new BrowserWindow({
      useContentSize: true,
      width: 480,
      height: 640,
      minWidth: 320,
      minHeight: 427,
      backgroundColor: "#10002b",
      title: "Catch the Coin",
      icon: path.join(__dirname, "Assets", "icon-512.png"),
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });
    win.setMenuBarVisibility(false);
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.loadFile(path.join(__dirname, "index.html"));
  }

  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(createWindow);
  app.on("window-all-closed", () => app.quit());
}
