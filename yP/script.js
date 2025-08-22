// --- 변수 및 상수 정의 ---
const videoListEl = document.getElementById('video-list');
const videoUrlInput = document.getElementById('video-url');
const addBtn = document.getElementById('add-btn');
const playerDiv = document.getElementById('player');
const STORAGE_KEY = 'youtubePlaylist';

let player;
let playlist = [];
let currentIndex = -1;
let fadeOutTimer = null;

// --- 초기화 ---
document.addEventListener('DOMContentLoaded', () => {
    loadPlaylist();
    addEventListeners();
});

// --- YouTube IFrame API 준비 시 호출 ---
function onYouTubeIframeAPIReady() {
    if (playlist.length > 0) {
        initializePlayer(0);
    }
}

// --- 플레이어 초기화 ---
function initializePlayer(index) {
    if (player) player.destroy();
    currentIndex = index;

    player = new YT.Player('player', {
        height: '360',
        width: '640',
        videoId: playlist[currentIndex].videoId,
        playerVars: {
            autoplay: 1,
            rel: 0,
            fs: 1,
            enablejsapi: 1,
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

// --- 로컬 저장소 연동 ---
async function loadPlaylist() {
    const storedList = localStorage.getItem(STORAGE_KEY);
    if (storedList) {
        try {
            playlist = JSON.parse(storedList);
            for (let video of playlist) {
                if (!video.title || video.title.startsWith('영상')) {
                    video.title = await fetchTitleFromOEmbed(video.videoId);
                }
            }
            savePlaylist();
        } catch (e) {
            console.error("로컬 저장소 파싱 실패:", e);
            playlist = [];
        }
    }
    renderPlaylist();
}

function savePlaylist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlist));
}

// --- DOM 렌더링 ---
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
    savePlaylist();
    renderPlaylist();

    if (!player) {
        initializePlayer(0);
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
        savePlaylist();
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

// --- 영상 재생 (수정된 부분) ---
function playVideo(index) {
    if (index >= 0 && index < playlist.length && player) {
        currentIndex = index;
        player.loadVideoById(playlist[currentIndex].videoId);
        updateActiveItem();
        updateMediaSession(playlist[currentIndex].title); // 👈 이 부분을 추가합니다
    } else if (!player && playlist.length > 0) {
        initializePlayer(index);
        updateMediaSession(playlist[index].title); // 👈 이 부분을 추가합니다
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

// --- Media Session API 함수 (추가된 부분) ---
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

        // 이전, 다음, 재생/일시정지 버튼 컨트롤러 추가
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