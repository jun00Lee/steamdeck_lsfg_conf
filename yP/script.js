// --- 변수 및 상수 정의 ---
const videoListEl = document.getElementById('video-list');
const videoUrlInput = document.getElementById('video-url');
const addBtn = document.getElementById('add-btn');
const playerDiv = document.getElementById('player');
const tabListEl = document.getElementById('tab-list');
const tabNameInput = document.getElementById('tab-name-input');
const addTabBtn = document.getElementById('add-tab-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importInput = document.getElementById('import-input');

const ALL_PLAYLISTS_KEY = 'allPlaylists';
const ACTIVE_TAB_KEY = 'activeTabName';

let player;
let allPlaylists = {};
let activeTabName = '기본';
let playlist = []; // 현재 활성화된 탭의 플레이리스트
let currentIndex = -1;
let fadeOutTimer = null;

// --- 초기화 ---
document.addEventListener('DOMContentLoaded', () => {
    loadAllPlaylists();
    addEventListeners();
});

// --- YouTube IFrame API 준비 시 호출 ---
function onYouTubeIframeAPIReady() {
    if (playlist.length > 0) {
        initializePlayer(0);
    }
}

// --- 플레이어 초기화 ---
function initializePlayer(index, autoplay = true) {
    if (player) player.destroy();
    currentIndex = index;

    player = new YT.Player('player', {
        height: '360',
        width: '640',
        videoId: playlist[currentIndex].videoId,
        playerVars: {
            autoplay: autoplay ? 1 : 0,
            rel: 0,
            fs: 1,
            enablejsapi: 1,
            playsinline: 1,
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange
        }
    });
}

// --- oEmbed로 제목 가져오기 ---
async function fetchTitleFromOEmbed(videoId) {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("oEmbed 요청 실패");
        const data = await response.json();
        return data.title;
    } catch (error) {
        console.error("제목 가져오기 실패:", error);
        return `제목 없음 (${videoId.substring(0, 5)}...)`;
    }
}

// --- 로컬 저장소 연동 (전체 플레이리스트) ---
async function loadAllPlaylists() {
    const storedPlaylists = localStorage.getItem(ALL_PLAYLISTS_KEY);
    const storedActiveTab = localStorage.getItem(ACTIVE_TAB_KEY);
    
    if (storedPlaylists) {
        try {
            allPlaylists = JSON.parse(storedPlaylists);
        } catch (e) {
            console.error("로컬 저장소 파싱 실패:", e);
            allPlaylists = {};
        }
    }
    
    if (Object.keys(allPlaylists).length === 0) {
        allPlaylists['기본'] = [];
    }
    
    if (storedActiveTab && allPlaylists[storedActiveTab]) {
        activeTabName = storedActiveTab;
    } else {
        activeTabName = Object.keys(allPlaylists)[0];
    }

    playlist = allPlaylists[activeTabName];
    
    for (let video of playlist) {
        if (!video.title || video.title.startsWith('제목 없음')) {
            video.title = await fetchTitleFromOEmbed(video.videoId);
        }
    }
    saveAllPlaylists();
    
    renderTabs();
    renderPlaylist();
}

function saveAllPlaylists() {
    allPlaylists[activeTabName] = playlist;
    localStorage.setItem(ALL_PLAYLISTS_KEY, JSON.stringify(allPlaylists));
    localStorage.setItem(ACTIVE_TAB_KEY, activeTabName);
}

// --- 탭 렌더링 및 이벤트 처리 ---
function renderTabs() {
    tabListEl.innerHTML = '';
    const tabNames = Object.keys(allPlaylists);

    tabNames.forEach(name => {
        const tabItem = document.createElement('li');
        tabItem.classList.add('tab-item');
        tabItem.textContent = name;
        tabItem.dataset.tabName = name;
        
        if (name === activeTabName) {
            tabItem.classList.add('active');
        }
        
        tabListEl.appendChild(tabItem);
    });
}

function switchTab(tabName) {
    if (activeTabName === tabName) return;

    activeTabName = tabName;
    playlist = allPlaylists[activeTabName] || [];
    saveAllPlaylists();
    renderTabs();
    renderPlaylist();
    
    if (playlist.length > 0) {
        initializePlayer(0, true);
    } else {
        if (player) {
            player.destroy();
            player = null;
        }
        playerDiv.innerHTML = '';
    }
}

// --- DOM 렌더링 (플레이리스트) ---
function renderPlaylist() {
    videoListEl.innerHTML = '';
    if (playlist.length === 0) {
        const message = document.createElement('li');
        message.classList.add('no-videos-message');
        message.textContent = '재생 목록이 비어 있습니다. 영상을 추가해주세요.';
        videoListEl.appendChild(message);
        return;
    }

    playlist.forEach((video, index) => {
        const listItem = document.createElement('li');
        listItem.classList.add('video-item');
        listItem.dataset.index = index;

        listItem.innerHTML = `
            <span class="video-title">${video.title}</span>
            <button class="delete-btn">삭제</button>
        `;
        videoListEl.appendChild(listItem);
    });
    updateActiveItem();
}

function updateActiveItem() {
    const videoItems = document.querySelectorAll('.video-item');
    videoItems.forEach((item, i) => {
        item.classList.toggle('active', i === currentIndex);
    });
}

// --- 이벤트 리스너 ---
function addEventListeners() {
    addBtn.addEventListener('click', addVideo);
    videoUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addVideo();
    });

    addTabBtn.addEventListener('click', addTab);
    tabNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTab();
    });

    tabListEl.addEventListener('click', (e) => {
        const tabItem = e.target.closest('.tab-item');
        if (tabItem) {
            switchTab(tabItem.dataset.tabName);
        }
    });

    videoListEl.addEventListener('click', (e) => {
        const item = e.target.closest('.video-item');
        if (!item) return;
        const index = parseInt(item.dataset.index);

        if (e.target.classList.contains('delete-btn')) {
            e.stopPropagation();
            deleteVideo(index);
        } else {
            playVideo(index);
        }
    });

    // 내보내기/불러오기 버튼 이벤트 리스너
    exportBtn.addEventListener('click', exportPlaylist);
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', importPlaylist);
}

// --- 탭 추가 ---
function addTab() {
    const tabName = tabNameInput.value.trim();
    if (!tabName) {
        alert('플레이리스트 이름을 입력해주세요.');
        return;
    }
    if (allPlaylists[tabName]) {
        alert('이미 존재하는 이름입니다. 다른 이름을 사용해주세요.');
        return;
    }
    
    allPlaylists[tabName] = [];
    activeTabName = tabName;
    playlist = allPlaylists[activeTabName];
    saveAllPlaylists();
    renderTabs();
    renderPlaylist();
    
    if (player) {
        player.destroy();
        player = null;
    }
    playerDiv.innerHTML = '';
    tabNameInput.value = '';
}

// --- 영상 추가 ---
async function addVideo() {
    const url = videoUrlInput.value.trim();
    if (!url) {
        alert('URL을 입력해주세요.');
        return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
        alert('유효한 YouTube URL이 아닙니다.');
        return;
    }

    const videoTitle = await fetchTitleFromOEmbed(videoId);
    const newVideo = { title: videoTitle, videoId: videoId };

    playlist.push(newVideo);
    saveAllPlaylists();
    renderPlaylist();

    if (!player) {
        initializePlayer(playlist.length - 1);
    } else if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
        playVideo(playlist.length - 1);
    }

    videoUrlInput.value = '';
}

// --- 영상 삭제 ---
function deleteVideo(index) {
    if (confirm("정말로 이 영상을 삭제하시겠습니까?")) {
        const isCurrent = index === currentIndex;
        playlist.splice(index, 1);
        saveAllPlaylists();
        renderPlaylist();

        if (index < currentIndex) currentIndex--;

        if (playlist.length === 0) {
            if (player) {
                player.destroy();
                player = null;
            }
            currentIndex = -1;
            playerDiv.innerHTML = '';
        } else if (isCurrent) {
            const nextIndex = index % playlist.length;
            playVideo(nextIndex);
        }
    }
}

// --- 영상 내보내기 (저장) ---
function exportPlaylist() {
    if (Object.keys(allPlaylists).length === 0) {
        alert('내보낼 플레이리스트가 없습니다.');
        return;
    }
    
    const dataStr = JSON.stringify(allPlaylists, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'playlist.json';
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- 영상 불러오기 ---
function importPlaylist(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (typeof importedData !== 'object' || importedData === null) {
                throw new Error('올바른 JSON 형식이 아닙니다.');
            }
            
            // 불러온 데이터로 allPlaylists 업데이트
            allPlaylists = importedData;
            
            // 불러온 데이터에 '기본' 탭이 없으면 추가
            if (!allPlaylists['기본']) {
                allPlaylists['기본'] = [];
            }
            
            // 활성 탭 설정
            activeTabName = Object.keys(allPlaylists)[0];
            playlist = allPlaylists[activeTabName];

            saveAllPlaylists(); // 로컬 스토리지에 저장
            renderTabs();
            renderPlaylist();

            alert('플레이리스트를 성공적으로 불러왔습니다!');

        } catch (error) {
            console.error('파일 불러오기 실패:', error);
            alert('유효한 playlist.json 파일이 아닙니다.');
        }
    };
    reader.readAsText(file);
}

// --- 영상 재생 ---
function playVideo(index) {
    if (index >= 0 && index < playlist.length) {
        currentIndex = index;
        if (player) {
            player.loadVideoById(playlist[currentIndex].videoId);
        } else {
            initializePlayer(index);
        }
        updateActiveItem();
        updateMediaSession(playlist[currentIndex].title);
    }
}

function onPlayerReady(event) {
    event.target.playVideo();
}

function onPlayerStateChange(event) {
    stopFadeOutCheck();
    if (event.data === YT.PlayerState.ENDED) {
        const nextIndex = (currentIndex + 1) % playlist.length;
        playVideo(nextIndex);
    } else if (event.data === YT.PlayerState.PLAYING) {
        startFadeOutCheck();
    }
}

// --- 페이드 아웃 ---
function startFadeOutCheck() {
    if (fadeOutTimer) clearInterval(fadeOutTimer);
    fadeOutTimer = setInterval(() => {
        const duration = player.getDuration();
        const currentTime = player.getCurrentTime();
        if (duration > 0 && duration - currentTime <= 5 && duration - currentTime >= 0) {
            playerDiv.style.opacity = (duration - currentTime) / 5;
        } else {
            playerDiv.style.opacity = 1;
        }
    }, 100);
}

function stopFadeOutCheck() {
    if (fadeOutTimer) {
        clearInterval(fadeOutTimer);
        fadeOutTimer = null;
        playerDiv.style.opacity = 1;
    }
}

// --- Media Session API 함수 ---
function updateMediaSession(title) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: title,
            artist: 'YouTube Playlist',
            album: 'My Playlist',
            artwork: [
                { src: `https://img.youtube.com/vi/${playlist[currentIndex].videoId}/mqdefault.jpg`, sizes: '320x180', type: 'image/jpeg' }
            ]
        });

        navigator.mediaSession.playbackState = 'playing';

        navigator.mediaSession.setActionHandler('play', () => { player.playVideo(); });
        navigator.mediaSession.setActionHandler('pause', () => { player.pauseVideo(); });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
            playVideo(prevIndex);
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            const nextIndex = (currentIndex + 1) % playlist.length;
            playVideo(nextIndex);
        });
    }
}

// --- videoId 추출 ---
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}