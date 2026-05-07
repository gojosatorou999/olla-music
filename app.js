// --- IndexedDB Wrapper for Offline Storage ---
const DB_NAME = 'OllaMusicDB';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';

let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => reject("IndexedDB error: " + event.target.error);

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

function addTrackToDB(track) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(track);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getAllTracks() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function deleteTrack(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// --- App State ---
let tracks = [];
let currentTrackIndex = -1;
let isPlaying = false;
let audioPlayer = document.getElementById('main-audio');

// --- UI Elements ---
const uploadBtn = document.getElementById('upload-btn');
const fileInput = document.getElementById('file-upload');
const songListEl = document.getElementById('song-list');
const songCountEl = document.getElementById('song-count');
const storageFillEl = document.getElementById('storage-fill');

const btnPlay = document.getElementById('btn-play');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const progressBar = document.getElementById('progress-bar');
const progressArea = document.getElementById('progress-area');
const timeCurrent = document.getElementById('time-current');
const timeTotal = document.getElementById('time-total');
const volumeSlider = document.getElementById('volume-slider');
const volumeLevel = document.getElementById('volume-level');

const currentTitle = document.getElementById('current-title');
const currentArtist = document.getElementById('current-artist');
const currentArtwork = document.getElementById('current-artwork');

// --- Initialization ---
async function initApp() {
    try {
        await initDB();
        await loadTracks();
        setupEventListeners();
        checkConnection();
        
        // Register Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('Service Worker registered', reg))
                .catch(err => console.error('Service Worker registration failed', err));
        }
    } catch (err) {
        console.error("Failed to initialize app:", err);
    }
}

// --- Core Functions ---
async function loadTracks() {
    tracks = await getAllTracks();
    renderTrackList();
    updateStorageInfo();
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

function parseFilename(filename) {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    const parts = nameWithoutExt.split(' - ');
    if (parts.length > 1) {
        return { artist: parts[0].trim(), title: parts[1].trim() };
    }
    return { artist: "Unknown Artist", title: nameWithoutExt.trim() };
}

function renderTrackList() {
    songListEl.innerHTML = '';
    
    if (tracks.length === 0) {
        songListEl.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-headphones-simple"></i>
                <h3>Your library is empty</h3>
                <p>Click 'Add Music' to start building your offline collection.</p>
            </div>
        `;
        return;
    }

    tracks.forEach((track, index) => {
        const item = document.createElement('div');
        item.className = `song-item ${index === currentTrackIndex ? 'playing' : ''}`;
        item.innerHTML = `
            <div class="song-icon">
                ${index === currentTrackIndex && isPlaying 
                    ? '<i class="fa-solid fa-chart-simple fa-bounce"></i>' 
                    : '<i class="fa-solid fa-music"></i>'}
            </div>
            <div class="song-details">
                <h4>${track.title}</h4>
                <p>${track.artist}</p>
            </div>
            <div class="song-size">${formatBytes(track.size)}</div>
            <button class="delete-btn" data-id="${track.id}"><i class="fa-solid fa-trash"></i></button>
        `;

        item.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn')) {
                handleDeleteTrack(track.id, e);
            } else {
                playTrack(index);
            }
        });

        songListEl.appendChild(item);
    });
}

function updateStorageInfo() {
    songCountEl.textContent = tracks.length;
    
    // Estimate storage used (just for visual effect)
    const totalBytes = tracks.reduce((acc, t) => acc + t.size, 0);
    // Assuming 500MB quota for visual bar
    const quota = 500 * 1024 * 1024; 
    const percentage = Math.min((totalBytes / quota) * 100, 100);
    
    storageFillEl.style.width = `${percentage}%`;
}

// --- Player Logic ---
function playTrack(index) {
    if (index < 0 || index >= tracks.length) return;
    
    if (currentTrackIndex === index && !audioPlayer.paused) {
        pauseAudio();
        return;
    }
    
    if (currentTrackIndex !== index) {
        currentTrackIndex = index;
        const track = tracks[currentTrackIndex];
        
        // Create object URL from stored Blob
        const blobUrl = URL.createObjectURL(track.blob);
        audioPlayer.src = blobUrl;
        
        // Update UI
        currentTitle.textContent = track.title;
        currentArtist.textContent = track.artist;
        currentArtwork.innerHTML = '<i class="fa-solid fa-record-vinyl fa-spin" style="--fa-animation-duration: 3s;"></i>';
    }
    
    playAudio();
    renderTrackList();
}

function playAudio() {
    audioPlayer.play();
    isPlaying = true;
    btnPlay.innerHTML = '<i class="fa-solid fa-pause"></i>';
}

function pauseAudio() {
    audioPlayer.pause();
    isPlaying = false;
    btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
    renderTrackList(); // to stop the bounce animation
}

function nextTrack() {
    let nextIndex = currentTrackIndex + 1;
    if (nextIndex >= tracks.length) nextIndex = 0;
    playTrack(nextIndex);
}

function prevTrack() {
    let prevIndex = currentTrackIndex - 1;
    if (prevIndex < 0) prevIndex = tracks.length - 1;
    playTrack(prevIndex);
}

async function handleDeleteTrack(id, event) {
    event.stopPropagation();
    await deleteTrack(id);
    
    // If deleted current track
    if (tracks[currentTrackIndex] && tracks[currentTrackIndex].id === id) {
        pauseAudio();
        currentTrackIndex = -1;
        currentTitle.textContent = "Not Playing";
        currentArtist.textContent = "--";
        currentArtwork.innerHTML = '<i class="fa-solid fa-music"></i>';
        progressBar.style.width = '0%';
        timeCurrent.textContent = "0:00";
        timeTotal.textContent = "0:00";
    }
    
    await loadTracks();
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (files.length === 0) return;

        uploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const meta = parseFilename(file.name);
            
            const trackData = {
                title: meta.title,
                artist: meta.artist,
                size: file.size,
                type: file.type,
                blob: file,
                dateAdded: new Date().getTime()
            };
            
            await addTrackToDB(trackData);
        }
        
        await loadTracks();
        fileInput.value = '';
        uploadBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Add Music';
    });

    btnPlay.addEventListener('click', () => {
        if (tracks.length === 0) return;
        if (currentTrackIndex === -1) {
            playTrack(0);
        } else if (audioPlayer.paused) {
            playAudio();
            renderTrackList();
        } else {
            pauseAudio();
        }
    });

    btnNext.addEventListener('click', nextTrack);
    btnPrev.addEventListener('click', prevTrack);

    audioPlayer.addEventListener('timeupdate', () => {
        const currentTime = audioPlayer.currentTime;
        const duration = audioPlayer.duration;
        
        if (duration) {
            const progressPercent = (currentTime / duration) * 100;
            progressBar.style.width = `${progressPercent}%`;
            
            timeCurrent.textContent = formatTime(currentTime);
            timeTotal.textContent = formatTime(duration);
        }
    });

    audioPlayer.addEventListener('ended', nextTrack);

    progressArea.addEventListener('click', (e) => {
        if (!audioPlayer.duration) return;
        const width = progressArea.clientWidth;
        const clickX = e.offsetX;
        const duration = audioPlayer.duration;
        audioPlayer.currentTime = (clickX / width) * duration;
    });

    volumeSlider.addEventListener('click', (e) => {
        const width = volumeSlider.clientWidth;
        const clickX = e.offsetX;
        const volume = clickX / width;
        audioPlayer.volume = volume;
        volumeLevel.style.width = `${volume * 100}%`;
    });
}

// Network Status
function checkConnection() {
    const badge = document.getElementById('offline-badge');
    
    const updateStatus = () => {
        if (navigator.onLine) {
            badge.className = 'offline-badge';
            badge.innerHTML = '<i class="fa-solid fa-wifi"></i> Online';
        } else {
            badge.className = 'offline-badge offline';
            badge.innerHTML = '<i class="fa-solid fa-plane"></i> Offline Mode';
        }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
}

// Start App
initApp();
