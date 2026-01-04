let playlists = [];
let currentSong = null;
let currentPlaylist = null;
let isPlaying = false;
let isMuted = false;
let previousVolume = 70;
let audioPlayer = null;
let selectedFiles = [];
let targetPlaylistId = null;

// File System functions using Electron API
async function saveToFileSystem() {
    try {
        const data = {
            playlists: playlists.map(p => ({
                ...p,
                songs: p.songs.map(s => ({
                    id: s.id,
                    title: s.title,
                    artist: s.artist,
                    duration: s.duration,
                    filePath: s.filePath,
                    albumArt: s.albumArt || null,
                    colorPalette: s.colorPalette || null
                }))
            }))
        };
        
        const result = await window.electronAPI.saveData(data);
        if (result.success) {
            console.log('Data saved successfully');
        } else {
            console.error('Error saving data:', result.error);
        }
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

async function loadFromFileSystem() {
    try {
        const data = await window.electronAPI.loadData();
        
        if (data && data.playlists) {
            playlists = data.playlists;
            console.log('Data loaded successfully');
        } else {
            // Default playlist
            playlists = [
                {
                    id: Date.now(),
                    name: 'My Playlist',
                    songs: []
                }
            ];
            console.log('No saved data, using default playlists');
        }
    } catch (error) {
        console.error('Error loading data:', error);
        playlists = [
            {
                id: Date.now(),
                name: 'My Playlist',
                songs: []
            }
        ];
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    audioPlayer = document.getElementById('audioPlayer');
    await loadFromFileSystem();
    renderPlaylists();
    
    // Audio player event listeners
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', nextSong);
    audioPlayer.addEventListener('loadedmetadata', () => {
        document.getElementById('duration').textContent = formatTime(audioPlayer.duration);
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.song-menu') && !e.target.closest('.song-menu-btn')) {
            closeAllMenus();
        }
    });

    // Allow Enter key to create playlist
    const playlistInput = document.getElementById('playlistNameInput');
    if (playlistInput) {
        playlistInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                createPlaylist();
            }
        });
    }
});

function renderPlaylists() {
    const container = document.getElementById('playlists');
    container.innerHTML = playlists.map(playlist => `
        <div class="playlist-item" id="playlist-${playlist.id}">
            <div class="playlist-header" onclick="togglePlaylist(${playlist.id})">
                <div class="playlist-info">
                    <h3>${playlist.name}</h3>
                    <p>${playlist.songs.length} songs</p>
                </div>
                <div class="playlist-actions">
                    <button class="add-song-btn" onclick="event.stopPropagation(); openAddSongsModal(${playlist.id})" title="Add songs">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                    </button>
                    <button class="playlist-menu-btn" onclick="event.stopPropagation(); togglePlaylistMenu(${playlist.id})" title="Options">⋮</button>
                    <span class="dropdown-icon">▼</span>
                </div>
            </div>
            <div class="playlist-menu" id="playlist-menu-${playlist.id}">
                <div class="playlist-menu-item delete" onclick="event.stopPropagation(); deletePlaylist(${playlist.id})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                    Delete Playlist
                </div>
            </div>
            <div class="playlist-songs">
                ${playlist.songs.length === 0 ? '<div class="empty-playlist">No songs yet. Click + to add songs.</div>' : ''}
                ${playlist.songs.map(song => {
                    let thumbnailContent = '♪';
                    let thumbnailStyle = '';
                    
                    if (song.albumArt && song.albumArt.data) {
                        thumbnailStyle = `background-image: url(data:${song.albumArt.format};base64,${song.albumArt.data}); background-size: cover; background-position: center; color: transparent;`;
                        thumbnailContent = '';
                    }
                    
                    return `
                    <div class="song-item" id="song-${song.id}">
                        <div class="song-icon" onclick="playSong(${playlist.id}, ${song.id})" style="${thumbnailStyle}">${thumbnailContent}</div>
                        <div class="song-details" onclick="playSong(${playlist.id}, ${song.id})">
                            <div class="song-title">${song.title}</div>
                            <div class="song-artist">${song.artist}</div>
                        </div>
                        <div class="song-duration" onclick="playSong(${playlist.id}, ${song.id})">${song.duration}</div>
                        <button class="song-menu-btn" onclick="event.stopPropagation(); toggleSongMenu(${playlist.id}, ${song.id})">⋮</button>
                        <div class="song-menu" id="menu-${song.id}">
                            <div class="song-menu-item delete" onclick="event.stopPropagation(); deleteSong(${playlist.id}, ${song.id})">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                </svg>
                                Delete
                            </div>
                        </div>
                    </div>
                `}).join('')}
            </div>
        </div>
    `).join('');
}

function togglePlaylist(playlistId) {
    const element = document.getElementById(`playlist-${playlistId}`);
    element.classList.toggle('active');
}

function playSong(playlistId, songId) {
    currentPlaylist = playlists.find(p => p.id === playlistId);
    currentSong = currentPlaylist.songs.find(s => s.id === songId);
    
    console.log('Playing song:', currentSong.title, 'Album art:', currentSong.albumArt ? 'YES' : 'NO');
    
    // Update UI
    document.querySelectorAll('.song-item').forEach(el => el.classList.remove('playing'));
    const songElement = document.getElementById(`song-${songId}`);
    if (songElement) {
        songElement.classList.add('playing');
    }
    
    document.getElementById('currentTitle').textContent = currentSong.title;
    document.getElementById('currentArtist').textContent = currentSong.artist;
    
    // Update album art
    const albumArtElement = document.querySelector('.album-art');
    if (currentSong.albumArt && currentSong.albumArt.data) {
        console.log('Displaying album art, format:', currentSong.albumArt.format);
        // Display the album art image
        const imgUrl = `data:${currentSong.albumArt.format};base64,${currentSong.albumArt.data}`;
        albumArtElement.style.backgroundImage = `url("${imgUrl}")`;
        albumArtElement.style.backgroundSize = 'cover';
        albumArtElement.style.backgroundPosition = 'center';
        albumArtElement.style.backgroundRepeat = 'no-repeat';
        albumArtElement.textContent = '';
        
        // Remove the gradient background to show image
        albumArtElement.style.background = `url("${imgUrl}") center/cover no-repeat`;
    } else {
        console.log('No album art available, showing default icon');
        // Show default music note with gradient
        albumArtElement.style.background = '';
        albumArtElement.style.backgroundImage = '';
        albumArtElement.textContent = '♪';
    }
    
    // Apply color theme from album art
    applyColorTheme(currentSong.colorPalette);
    
    // Play audio from file path
    if (currentSong.filePath) {
        // Electron allows loading local files directly
        audioPlayer.src = `file:///${currentSong.filePath.replace(/\\/g, '/')}`;
        audioPlayer.play().then(() => {
            isPlaying = true;
            updatePlayButton();
        }).catch(error => {
            console.error('Error playing audio:', error);
            isPlaying = false;
            updatePlayButton();
        });
    } else {
        isPlaying = false;
        updatePlayButton();
    }
}

function applyColorTheme(colorPalette) {
    if (!colorPalette) {
        // Reset to default colors
        document.documentElement.style.setProperty('--primary-color', '#6366f1');
        document.documentElement.style.setProperty('--primary-dark', '#4f46e5');
        document.documentElement.style.setProperty('--secondary-color', '#8b5cf6');
        document.documentElement.style.setProperty('--accent-color', '#667eea');
        document.documentElement.style.setProperty('--bg-grad-start', '#667eea');
        document.documentElement.style.setProperty('--bg-grad-end', '#764ba2');
        console.log('Applied default color theme');
        return;
    }
    
    // Use extracted colors
    const primary = colorPalette.vibrant || '#6366f1';
    const primaryDark = colorPalette.darkVibrant || '#4f46e5';
    const secondary = colorPalette.lightVibrant || '#8b5cf6';
    const accent = colorPalette.muted || '#667eea';
    const gradientStart = colorPalette.vibrant || '#667eea';
    const gradientEnd = colorPalette.darkVibrant || '#764ba2';
    
    // Apply CSS variables (using the new variable names from optimized CSS)
    document.documentElement.style.setProperty('--primary-color', primary);
    document.documentElement.style.setProperty('--primary-dark', primaryDark);
    document.documentElement.style.setProperty('--secondary-color', secondary);
    document.documentElement.style.setProperty('--accent-color', accent);
    document.documentElement.style.setProperty('--bg-grad-start', gradientStart);
    document.documentElement.style.setProperty('--bg-grad-end', gradientEnd);
    
    console.log('Applied color theme:', {
        primary,
        primaryDark,
        secondary,
        accent,
        gradientStart,
        gradientEnd
    });
}

function togglePlay() {
    if (!currentSong) return;
    
    if (isPlaying) {
        audioPlayer.pause();
        isPlaying = false;
    } else {
        if (currentSong.filePath) {
            audioPlayer.play().then(() => {
                isPlaying = true;
            }).catch(error => {
                console.error('Error playing audio:', error);
            });
        }
    }
    updatePlayButton();
}

function updatePlayButton() {
    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');
    
    if (isPlaying) {
        // Pause icon
        playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    } else {
        // Play icon
        playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    }
    
    // Add/remove pulse animation class
    if (isPlaying) {
        playBtn.classList.add('playing');
    } else {
        playBtn.classList.remove('playing');
    }
}

function previousSong() {
    if (!currentSong || !currentPlaylist) return;
    const currentIndex = currentPlaylist.songs.findIndex(s => s.id === currentSong.id);
    const prevIndex = currentIndex === 0 ? currentPlaylist.songs.length - 1 : currentIndex - 1;
    playSong(currentPlaylist.id, currentPlaylist.songs[prevIndex].id);
}

function nextSong() {
    if (!currentSong || !currentPlaylist) return;
    const currentIndex = currentPlaylist.songs.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % currentPlaylist.songs.length;
    playSong(currentPlaylist.id, currentPlaylist.songs[nextIndex].id);
}

function changeVolume(value) {
    const volumeIcon = document.getElementById('volumeIcon');
    audioPlayer.volume = value / 100;
    
    // Update icon based on volume level
    if (value == 0) {
        volumeIcon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
        `;
    } else if (value < 50) {
        volumeIcon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 9v6h4l5 5V4l-5 5H7z"/>
            </svg>
        `;
    } else {
        volumeIcon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
        `;
    }
    isMuted = false;
    previousVolume = value; // Update previousVolume when changing
}

function toggleMute() {
    const slider = document.getElementById('volumeSlider');
    const volumeIcon = document.getElementById('volumeIcon');
    
    if (isMuted) {
        slider.value = previousVolume;
        audioPlayer.volume = previousVolume / 100;
        isMuted = false;
        changeVolume(previousVolume);
    } else {
        previousVolume = slider.value;
        slider.value = 0;
        audioPlayer.volume = 0;
        isMuted = true;
        volumeIcon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
        `;
    }
}

function seek(event) {
    if (!currentSong || !currentSong.filePath) return;
    const bar = event.currentTarget;
    const percent = event.offsetX / bar.offsetWidth;
    audioPlayer.currentTime = percent * audioPlayer.duration;
}

function updateProgress() {
    if (!currentSong || !currentSong.filePath) return;
    const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    document.getElementById('progress').style.width = percent + '%';
    document.getElementById('currentTime').textContent = formatTime(audioPlayer.currentTime);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Modal Functions
function openPlaylistModal() {
    document.getElementById('playlistModal').classList.add('active');
    document.getElementById('playlistNameInput').focus();
}

function closePlaylistModal() {
    document.getElementById('playlistModal').classList.remove('active');
    document.getElementById('playlistNameInput').value = '';
}

function createPlaylist() {
    const name = document.getElementById('playlistNameInput').value.trim();
    if (name) {
        const newPlaylist = {
            id: Date.now(),
            name: name,
            songs: []
        };
        playlists.push(newPlaylist);
        saveToFileSystem();
        renderPlaylists();
        closePlaylistModal();
    }
}

function openAddSongsModal(playlistId) {
    targetPlaylistId = playlistId;
    selectedFiles = [];
    document.getElementById('selectedFiles').innerHTML = '';
    document.getElementById('addSongsModal').classList.add('active');
}

function closeAddSongsModal() {
    document.getElementById('addSongsModal').classList.remove('active');
    targetPlaylistId = null;
    selectedFiles = [];
}

// Open file dialog using Electron API
async function handleFileSelect(event) {
    event.preventDefault();
    
    try {
        const filePaths = await window.electronAPI.openFileDialog();
        
        if (filePaths && filePaths.length > 0) {
            selectedFiles = filePaths;
            displaySelectedFiles();
        }
    } catch (error) {
        console.error('Error selecting files:', error);
    }
}

// Load entire folder
async function openFolderUpload() {
    try {
        const result = await window.electronAPI.openFolderDialog();
        
        if (result && result.files.length > 0) {
            const newPlaylist = {
                id: Date.now(),
                name: result.folderName,
                songs: []
            };
            
            // Process all files
            for (const filePath of result.files) {
                const metadata = await window.electronAPI.getAudioMetadata(filePath);
                
                console.log('Loaded metadata for:', metadata.title, 'Has album art:', !!metadata.albumArt);
                
                const newSong = {
                    id: Date.now() + Math.random(),
                    title: metadata.title,
                    artist: metadata.artist,
                    duration: formatTime(metadata.duration),
                    filePath: filePath,
                    albumArt: metadata.albumArt ? {
                        format: metadata.albumArt.format,
                        data: metadata.albumArt.data
                    } : null,
                    colorPalette: metadata.colorPalette || null
                };
                
                newPlaylist.songs.push(newSong);
            }
            
            playlists.push(newPlaylist);
            await saveToFileSystem();
            renderPlaylists();
            
            // Show custom success notification instead of alert
            showNotification(`Loaded ${result.files.length} songs from "${result.folderName}"`, 'success');
        }
    } catch (error) {
        console.error('Error loading folder:', error);
        showNotification('Error loading folder', 'error');
    }
}

function displaySelectedFiles() {
    const container = document.getElementById('selectedFiles');
    container.innerHTML = selectedFiles.map((filePath, index) => {
        const fileName = filePath.split(/[/\\]/).pop();
        return `
            <div class="file-item">
                <span class="file-name">${fileName}</span>
                <button class="remove-file" onclick="removeFile(${index})">Remove</button>
            </div>
        `;
    }).join('');
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    displaySelectedFiles();
}

async function addSongsToPlaylist() {
    if (selectedFiles.length === 0 || !targetPlaylistId) return;
    
    const playlist = playlists.find(p => p.id === targetPlaylistId);
    if (!playlist) return;
    
    // Process files
    for (const filePath of selectedFiles) {
        try {
            const metadata = await window.electronAPI.getAudioMetadata(filePath);
            
            const newSong = {
                id: Date.now() + Math.random(),
                title: metadata.title,
                artist: metadata.artist,
                duration: formatTime(metadata.duration),
                filePath: filePath,
                albumArt: metadata.albumArt || null,
                colorPalette: metadata.colorPalette || null
            };
            
            playlist.songs.push(newSong);
        } catch (error) {
            console.error('Error processing file:', filePath, error);
        }
    }
    
    await saveToFileSystem();
    renderPlaylists();
    closeAddSongsModal();
}

function toggleSongMenu(playlistId, songId) {
    const menu = document.getElementById(`menu-${songId}`);
    
    console.log('Toggle menu for song:', songId, 'Menu found:', !!menu);
    
    if (!menu) return;
    
    // Close all other menus first
    closeAllMenus();
    
    // Toggle current menu
    menu.classList.add('active');
    console.log('Menu activated, classes:', menu.className);
}

function togglePlaylistMenu(playlistId) {
    const menu = document.getElementById(`playlist-menu-${playlistId}`);
    
    console.log('Toggle playlist menu for:', playlistId, 'Menu found:', !!menu);
    
    if (!menu) return;
    
    // Close all other menus first
    closeAllMenus();
    
    // Toggle current menu
    menu.classList.add('active');
    console.log('Playlist menu activated, classes:', menu.className);
}

function closeAllMenus() {
    document.querySelectorAll('.song-menu').forEach(menu => {
        menu.classList.remove('active');
    });
    document.querySelectorAll('.playlist-menu').forEach(menu => {
        menu.classList.remove('active');
    });
}

function deleteSong(playlistId, songId) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    const song = playlist.songs.find(s => s.id === songId);
    if (!song) return;
    
    // Store pending delete info
    pendingDelete = {
        type: 'song',
        playlistId: playlistId,
        songId: songId
    };
    
    // Update modal content
    document.getElementById('deleteModalTitle').textContent = 'Delete Song?';
    document.getElementById('deleteModalMessage').textContent = `Are you sure you want to delete "${song.title}"? This action cannot be undone.`;
    
    // Show modal
    document.getElementById('deleteModal').classList.add('active');
    closeAllMenus();
}

function deletePlaylist(playlistId) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    // Store pending delete info
    pendingDelete = {
        type: 'playlist',
        playlistId: playlistId
    };
    
    // Update modal content
    document.getElementById('deleteModalTitle').textContent = 'Delete Playlist?';
    document.getElementById('deleteModalMessage').textContent = `Are you sure you want to delete "${playlist.name}" with ${playlist.songs.length} song(s)? This action cannot be undone.`;
    
    // Show modal
    document.getElementById('deleteModal').classList.add('active');
    closeAllMenus();
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    pendingDelete = null;
}

function confirmDelete() {
    if (!pendingDelete) return;
    
    if (pendingDelete.type === 'song') {
        // Delete song with animation
        const playlist = playlists.find(p => p.id === pendingDelete.playlistId);
        if (!playlist) return;
        
        // Check if playlist is currently open
        const playlistElement = document.getElementById(`playlist-${pendingDelete.playlistId}`);
        const wasOpen = playlistElement && playlistElement.classList.contains('active');
        
        // Check if this is the currently playing song BEFORE animation
        if (currentSong && currentSong.id === pendingDelete.songId) {
            audioPlayer.pause();
            audioPlayer.src = '';
            currentSong = null;
            isPlaying = false;
            updatePlayButton();
            document.getElementById('currentTitle').textContent = 'Select a Song';
            document.getElementById('currentArtist').textContent = 'Unknown Artist';
            document.getElementById('progress').style.width = '0%';
            document.getElementById('currentTime').textContent = '0:00';
            document.getElementById('duration').textContent = '0:00';
            
            // Reset album art
            const albumArtElement = document.querySelector('.album-art');
            albumArtElement.style.background = '';
            albumArtElement.style.backgroundImage = '';
            albumArtElement.textContent = '♪';
        }
        
        // DELETE FROM DATA FIRST
        playlist.songs = playlist.songs.filter(s => s.id !== pendingDelete.songId);
        saveToFileSystem();
        
        // THEN animate
        const songElement = document.getElementById(`song-${pendingDelete.songId}`);
        if (songElement) {
            songElement.style.animation = 'slideOutRight 0.3s ease-out forwards';
            
            setTimeout(() => {
                // Re-render to update counts and remove the element
                renderPlaylists();
                
                // Re-open the playlist if it was open before
                if (wasOpen) {
                    setTimeout(() => {
                        const updatedPlaylistElement = document.getElementById(`playlist-${pendingDelete.playlistId}`);
                        if (updatedPlaylistElement) {
                            updatedPlaylistElement.classList.add('active');
                        }
                    }, 10);
                }
            }, 300);
        } else {
            // If element not found, just re-render immediately
            renderPlaylists();
            if (wasOpen) {
                setTimeout(() => {
                    const updatedPlaylistElement = document.getElementById(`playlist-${pendingDelete.playlistId}`);
                    if (updatedPlaylistElement) {
                        updatedPlaylistElement.classList.add('active');
                    }
                }, 10);
            }
        }
        
    } else if (pendingDelete.type === 'playlist') {
        // Delete playlist
        const playlist = playlists.find(p => p.id === pendingDelete.playlistId);
        
        // Check if currently playing song is from this playlist
        if (currentPlaylist && currentPlaylist.id === pendingDelete.playlistId) {
            audioPlayer.pause();
            audioPlayer.src = '';
            currentSong = null;
            currentPlaylist = null;
            isPlaying = false;
            updatePlayButton();
            document.getElementById('currentTitle').textContent = 'Select a Song';
            document.getElementById('currentArtist').textContent = 'Unknown Artist';
            document.getElementById('progress').style.width = '0%';
            document.getElementById('currentTime').textContent = '0:00';
            document.getElementById('duration').textContent = '0:00';
            
            // Reset album art
            const albumArtElement = document.querySelector('.album-art');
            albumArtElement.style.background = '';
            albumArtElement.style.backgroundImage = '';
            albumArtElement.textContent = '♪';
        }
        
        // Remove playlist
        playlists = playlists.filter(p => p.id !== pendingDelete.playlistId);
        saveToFileSystem();
        renderPlaylists();
    }
    
    closeDeleteModal();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        togglePlay();
    }
});