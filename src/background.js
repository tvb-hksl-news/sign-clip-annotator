"use strict";

import { app, protocol, BrowserWindow, Menu } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import installExtension, { VUEJS_DEVTOOLS } from "electron-devtools-installer";
const isDevelopment = process.env.NODE_ENV !== "production";

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } },
]);

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1024,
    height: 768,
    title: "Sign Clip Annotator",
    frame: false,
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
    },
  });

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
    if (!process.env.IS_TEST) win.webContents.openDevTools();
  } else {
    createProtocol("app");
    // Load the index.html when not in development
    win.loadURL("app://./index.html");
  }

  // Create menu
  const menuTemplate = [
    {
      label: "File",
      submenu: [
        {
          label: "Quit",
          click() {
            app.quit();
          },
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
        { type: "separator" },
        {
          label: "Jump to Previous Video",
          accelerator: "Shift+Enter",
          click() {
            win.webContents.send("jump-to-previous-video");
          },
        },
        {
          label: "Jump to Next Video",
          accelerator: "CmdOrCtrl+Enter",
          click() {
            win.webContents.send("jump-to-next-video");
          },
        },
      ],
    },
    {
      label: "View",
      submenu: [{ role: "minimize" }, { role: "togglefullscreen" }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  win.on("closed", () => {
    win = null;
  });
}

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
  registerLocalResourceProtocol();

  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS);
    } catch (e) {
      console.error("Vue Devtools failed to install:", e.toString());
    }
  }
  createWindow();
});

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === "win32") {
    process.on("message", (data) => {
      if (data === "graceful-exit") {
        app.quit();
      }
    });
  } else {
    process.on("SIGTERM", () => {
      app.quit();
    });
  }
}

import { ipcMain, dialog } from "electron";

function registerLocalResourceProtocol() {
  // To load resources from outside of the "public" folder, one may disable WebSecurity.
  // However, that is not safe, instead, we do the following.
  // https://nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration
  protocol.registerFileProtocol("local-resource", (request, callback) => {
    const url = request.url.replace(/^local-resource:\/\//, "");
    // Decode URL to prevent errors when loading filenames with UTF-8 chars or chars like "#"
    const decodedUrl = decodeURI(url); // Needed in case URL contains spaces
    try {
      return callback(decodedUrl);
    } catch (error) {
      console.error(
        "ERROR: registerLocalResourceProtocol: Could not get file path:",
        error
      );
    }
  });
}

ipcMain.on("try-open-root", (event) => {
  dialog
    .showOpenDialog({
      properties: ["openDirectory"],
    })
    .then(({ filePaths }) => {
      if (filePaths && filePaths.length > 0) {
        event.sender.send("open-root", filePaths[0]);
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

ipcMain.on("try-export-annotations", (event) => {
  dialog
    .showSaveDialog({
      title: "Export Annotations",
      defaultPath: "*/annotations.csv",
      filters: [{ name: "CSV", extensions: [".csv"] }],
    })
    .then(({ filePath }) => {
      if (filePath) {
        event.sender.send("export-annotations", filePath);
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

ipcMain.on("try-recover", (event) => {
  dialog
    .showOpenDialog({
      title: "Recover",
      defaultPath: "*/annotations.csv",
      properties: ["openFile"],
      filters: [{ name: "CSV", extensions: ["csv"] }],
    })
    .then(({ filePaths }) => {
      if (filePaths && filePaths.length > 0) {
        dialog
          .showMessageBox({
            type: "question",
            buttons: ["No", "Yes, I intend to do so."],
            title: "Dangerous!",
            message:
              'All existing annotations will be overwritten by "' +
              filePaths[0] +
              '". Are you sure to recover to it?',
          })
          .then(({ response }) => {
            if (response === 1) {
              event.sender.send("recover", filePaths[0]);
            }
          });
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

ipcMain.on("try-export-lexicon", (event) => {
  dialog
    .showSaveDialog({
      title: "Export Lexicon",
      defaultPath: "*/lexicon.csv",
      filters: [{ name: "CSV", extensions: [".csv"] }],
    })
    .then(({ filePath }) => {
      if (filePath) {
        event.sender.send("export-lexicon", filePath);
      }
    })
    .catch((err) => {
      console.log(err);
    });
});
