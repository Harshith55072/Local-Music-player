const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const Vibrant = require('node-vibrant');

let mainWindow;
let mm; // Will be loaded dynamically

// Get user data path for storing playlists
const userDataPath = app.getPath('userData');
const dataFilePath = path.join(userDataPath, 'playlists.json');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false // Allow loading local files
    },
    backgroundColor: '#1a1a1a',
    icon: path.join(__dirname, 'icon.png')
  });

  mainWindow.loadFile('index.html');

  // Open DevTools only in development (commented out for production)
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle file dialog for individual files
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'mpeg'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (canceled) {
    return [];
  }
  return filePaths;
});

// Handle folder dialog
ipcMain.handle('dialog:openFolder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (canceled || !filePaths.length) {
    return null;
  }
  
  const folderPath = filePaths[0];
  const folderName = path.basename(folderPath);
  
  try {
    const files = await fs.readdir(folderPath);
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.mpeg'];
    const audioFiles = files.filter(file => 
      audioExtensions.includes(path.extname(file).toLowerCase())
    );
    
    const fullPaths = audioFiles.map(file => path.join(folderPath, file));
    
    return {
      folderName,
      files: fullPaths
    };
  } catch (error) {
    console.error('Error reading folder:', error);
    return null;
  }
});

// Get audio metadata
ipcMain.handle('audio:metadata', async (event, filePath) => {
  try {
    // Lazy load music-metadata as ES module
    if (!mm) {
      mm = await import('music-metadata');
    }
    
    const metadata = await mm.parseFile(filePath);
    
    // Extract album art if available
    let albumArt = null;
    let colorPalette = null;
    
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      console.log('Found album art:', picture.format, 'size:', picture.data.length);
      
      // Convert buffer to base64
      const base64Data = picture.data.toString('base64');
      albumArt = {
        format: picture.format,
        data: base64Data
      };
      
      // Extract color palette from album art
      try {
        console.log('Attempting to extract colors from album art...');
        const buffer = picture.data;
        const v = new Vibrant(buffer);
        const palette = await v.getPalette();
        
        colorPalette = {
          vibrant: palette.Vibrant ? palette.Vibrant.getHex() : null,
          darkVibrant: palette.DarkVibrant ? palette.DarkVibrant.getHex() : null,
          lightVibrant: palette.LightVibrant ? palette.LightVibrant.getHex() : null,
          muted: palette.Muted ? palette.Muted.getHex() : null,
          darkMuted: palette.DarkMuted ? palette.DarkMuted.getHex() : null,
          lightMuted: palette.LightMuted ? palette.LightMuted.getHex() : null
        };
        
        console.log('✓ Extracted color palette:', colorPalette);
      } catch (colorError) {
        console.error('✗ Error extracting colors:', colorError.message);
      }
    } else {
      console.log('No album art found in:', path.basename(filePath));
    }
    
    return {
      title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
      artist: metadata.common.artist || 'Unknown Artist',
      duration: metadata.format.duration || 0,
      albumArt: albumArt,
      colorPalette: colorPalette
    };
  } catch (error) {
    console.error('Error reading metadata for', filePath, ':', error);
    return {
      title: path.basename(filePath, path.extname(filePath)),
      artist: 'Unknown Artist',
      duration: 0,
      albumArt: null,
      colorPalette: null
    };
  }
});

// Save playlist data
ipcMain.handle('storage:save', async (event, data) => {
  try {
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Error saving data:', error);
    return { success: false, error: error.message };
  }
});

// Load playlist data
ipcMain.handle('storage:load', async () => {
  try {
    const data = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist yet, return default structure
      return {
        playlists: [
          {
            id: Date.now(),
            name: 'My Playlist',
            songs: []
          }
        ]
      };
    }
    console.error('Error loading data:', error);
    return null;
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});