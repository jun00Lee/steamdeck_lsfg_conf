// --- 변수 및 상수 정의 ---
const videoListEl = document.getElementById('video-list');
const videoUrlInput = document.getElementById('video-url');
const addBtn = document.getElementById('add-btn');
const playerDiv = document.getElementById('player'); // 플레이어를 삽입할 div
const STORAGE_KEY = 'youtubePlaylist';

let playlist = []; // 재생 목록 배열

// --- 초기화 함수 ---
document.addEventListener('DOMContentLoaded', () => {
    loadPlaylist();
    addEventListeners();
    // 초기 로딩 시 첫 번째 영상 재생
    if (playlist.length > 0) {
        playVideo(0);
    }
});

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
    videoListEl.innerHTML = ''; // 기존 목록 초기화
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
    
    // 추가 후 바로 재생
    playVideo(playlist.length - 1);
    videoUrlInput.value = '';
}

function deleteVideo(index) {
    if (confirm("정말로 이 영상을 삭제하시겠습니까?")) {
        playlist.splice(index, 1);
        savePlaylist();
        renderPlaylist();
        // 삭제 후 첫 번째 영상 재생
        if (playlist.length > 0) {
            playVideo(0);
        } else {
            playerDiv.innerHTML = ''; // 목록이 비면 플레이어 비움
        }
    }
}

// --- 영상 재생 및 제어 ---
function playVideo(index) {
    if (index >= 0 && index < playlist.length) {
        const video = playlist[index];
        
        // 기존 플레이어 삭제 후 새로 생성
        playerDiv.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.setAttribute('width', '100%');
        iframe.setAttribute('height', '100%');
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowfullscreen', '1');
        // 프로토콜을 명시적으로 'https:'로 변경합니다.
        iframe.setAttribute('src', `https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0`);
        
        playerDiv.appendChild(iframe);
        
        // 현재 재생 중인 항목을 하이라이트
        const videoItems = document.querySelectorAll('.video-item');
        videoItems.forEach((item, i) => {
            if (i === index) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
}

// YouTube URL에서 videoId를 추출하는 함수
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}