// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu, ipcMain, shell} = require('electron');
const path = require('node:path');
const os = require('os');
const fs = require('fs');
const resizeImg = require('resize-img');

const isMac = process.platform == 'darwin';
// If we are in a development environment
const isDev = process.env.NODE_ENV !== 'production';

let mainWindow;

const createMainWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    title: "Image Resizer",
    width: isDev ? 1200 : 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname,'./renderer/index.html'));

  // Open the DevTools if in dev env.
  if (isDev){
    mainWindow.webContents.openDevTools();
  }
}

const createAboutWindow = () => {
  const aboutWindow = new BrowserWindow({
    title: "Image Resizer",
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // and load the index.html of the app.
  aboutWindow.loadFile(path.join(__dirname,'./renderer/about.html'));
}

// Menu Template
const menu = [
  ...(isMac ? [{
		label: app.name,
		submenu: [
			{
				label: 'About',
        click: createAboutWindow
			}
		]
	}] : []),
  {
    label: 'File',
    submenu: [
      {
        label: 'Quit',
        click: () => app.quit(),
        accelerator: 'CmdOrCtrl+W'
      }
    ]
  },
  ...(!isMac ? [{
    label: 'Help',
    submenu: [
      {
        label: 'About',
        click: createAboutWindow
      }
    ]
  }] : [])
]



// Respond to ipcRenderer resize
ipcMain.on('image:resize', (e, options) => {
  options.dest = path.join(os.homedir(),'imageresizer');
  resizeImage(options);
})

const resizeImage = async ({imgPath, width, height, dest}) => {
  try {
    const newPath = await resizeImg(fs.readFileSync(imgPath), {
      width: +width,
      height: +height,
    });

    const filename = 'resized_' + path.basename(imgPath);

    // Create dest folder
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }

    // Write file to destination folder
    fs.writeFileSync(path.join(dest, filename), newPath);

    // Send success to renderer, as an event
    mainWindow.webContents.send('image:done');

    // Open dest folder
    shell.openPath(dest);

  } catch (error) {
    console.log(error);
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createMainWindow();

  // Implement menu
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu)

  // Remove mainWindow from memory on close, to prevent leak
  mainWindow.on('closed', () => (mainWindow = null))

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});



// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (!isMac) app.quit();
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.