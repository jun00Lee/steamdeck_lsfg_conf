// --- 변수 및 상수 정의 ---
const videoListEl = document.getElementById('video-list');
const videoUrlInput = document.getElementById('video-url');
const addBtn = document.getElementById('add-btn');
const playerDiv = document.getElementById('player');
const STORAGE_KEY = 'youtubePlaylist';

let player; // YT.Player 인스턴스를 저장할 변수
let playlist = []; // 재생 목록 배열
let currentIndex = -1; // 현재 재생 중인 영상의 인덱스
let fadeOutTimer = null; // 페이드 아웃 타이머를 저장할 변수

// --- 초기화 함수 ---
document.addEventListener('DOMContentLoaded', () => {
    loadPlaylist();
    addEventListeners();
});

// 유튜브 IFrame Player API가 준비되면 이 함수가 자동으로 호출됩니다.
function onYouTubeIframeAPIReady() {
    console.log("YouTube API is ready.");
    if (playlist.length > 0) {
        initializePlayer(0);
    }
}

// 플레이어를 초기화하고 첫 번째 영상을 로드합니다.
function initializePlayer(index) {
    if (player) {
        player.destroy();
    }
    currentIndex = index;
    const firstVideoId = playlist[currentIndex].videoId;

    player = new YT.Player('player', {
        height: '360',
        width: '640',
        videoId: firstVideoId,
        playerVars: {
            'autoplay': 1,
            'rel': 0, // 관련 동영상 표시 안 함
            'fs': 1, // 전체 화면 버튼 표시
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

// --- 로컬 저장소 연동 ---
function loadPlaylist() {
    const storedList = localStorage.getItem(STORAGE_KEY);
    if (storedList) {
        try {
            playlist = JSON.parse(storedList);
        } catch (e) {
            console.error("Failed to parse playlist from localStorage:", e);
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
        if (i === currentIndex) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// --- 이벤트 리스너 ---
function addEventListeners() {
    addBtn.addEventListener('click', addVideo);
    videoUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addVideo();
        }
    });

    videoListEl.addEventListener('click', (e) => {
        const item = e.target.closest('.video-item');
        if (!item) return;
        const index = parseInt(item.dataset.index);
        
        if (e.target.classList.contains('delete-btn')) {
            e.stopPropagation(); // 플레이 이벤트가 버블링되지 않도록
            deleteVideo(index);
        } else {
            playVideo(index);
        }
    });
}

// --- 영상 추가 / 삭제 ---
function addVideo() {
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

    const videoTitle = `영상 ${playlist.length + 1}`;
    const newVideo = { title: videoTitle, videoId: videoId };

    playlist.push(newVideo);
    savePlaylist();
    renderPlaylist();

    // 첫 영상이 추가되면 플레이어 초기화
    if (!player) {
        initializePlayer(0);
    } else {
        // 영상 추가 후 현재 재생 중인 영상이 없다면 바로 재생
        if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
            playVideo(playlist.length - 1);
        }
    }

    videoUrlInput.value = '';
}

function deleteVideo(index) {
    if (confirm("정말로 이 영상을 삭제하시겠습니까?")) {
        // 현재 재생 중인 영상을 삭제하는 경우
        if (index === currentIndex) {
            const nextIndex = (index + 1) % playlist.length;
            playlist.splice(index, 1);
            savePlaylist();
            renderPlaylist();
            if (playlist.length > 0) {
                // 다음 영상이 있다면 재생, 없다면 0번 영상 재생
                playVideo(nextIndex < playlist.length ? nextIndex : 0);
            } else {
                player.destroy();
                player = null;
                currentIndex = -1;
                playerDiv.innerHTML = '';
            }
        } else {
            // 다른 영상을 삭제하는 경우
            playlist.splice(index, 1);
            savePlaylist();
            renderPlaylist();
            // 삭제로 인해 인덱스가 변경될 수 있으므로 현재 인덱스 업데이트
            if (index < currentIndex) {
                currentIndex--;
            }
        }
    }
}

// --- 영상 재생 및 제어 ---
function playVideo(index) {
    if (index >= 0 && index < playlist.length && player) {
        currentIndex = index;
        const videoId = playlist[currentIndex].videoId;
        player.loadVideoById(videoId);
        updateActiveItem();
    } else if (!player && playlist.length > 0) {
        initializePlayer(index);
    }
}

// 플레이어가 준비되면 호출됩니다.
function onPlayerReady(event) {
    event.target.playVideo();
    startFadeOutCheck();
}

// 플레이어 상태가 변경될 때 호출됩니다.
function onPlayerStateChange(event) {
    // YT.PlayerState.ENDED (0) = 영상이 끝났을 때
    if (event.data === YT.PlayerState.ENDED) {
        stopFadeOutCheck();
        const nextIndex = (currentIndex + 1) % playlist.length;
        playVideo(nextIndex);
    } 
    // YT.PlayerState.PLAYING (1) = 영상이 재생 중일 때
    else if (event.data === YT.PlayerState.PLAYING) {
        startFadeOutCheck();
    }
    // 다른 상태일 때 페이드 아웃 타이머 정지
    else {
        stopFadeOutCheck();
    }
}

// 영상 종료 5초 전 페이드 아웃 체크를 시작합니다.
function startFadeOutCheck() {
    if (fadeOutTimer) {
        clearInterval(fadeOutTimer);
    }
    fadeOutTimer = setInterval(() => {
        const remainingTime = player.getDuration() - player.getCurrentTime();
        if (remainingTime <= 5 && remainingTime > 0) {
            playerDiv.style.opacity = remainingTime / 5;
        } else {
            playerDiv.style.opacity = 1;
        }
    }, 100); // 0.1초마다 체크
}

// 페이드 아웃 체크를 중지합니다.
function stopFadeOutCheck() {
    if (fadeOutTimer) {
        clearInterval(fadeOutTimer);
        fadeOutTimer = null;
        playerDiv.style.opacity = 1; // opacity를 1로 되돌림
    }
}

// YouTube URL에서 videoId를 추출하는 함수
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}