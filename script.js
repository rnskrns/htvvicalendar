import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, addDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyCYU5fUl5HKlvix7da_muE12fwI34Zf4RY",
    authDomain: "htvvi-calendar.firebaseapp.com",
    projectId: "htvvi-calendar",
    storageBucket: "htvvi-calendar.firebasestorage.app",
    messagingSenderId: "629395623347",
    appId: "1:629395623347:web:64b75d50633ac275c58fc6",
    measurementId: "G-QECSWX905Y",
    databaseURL: "https://htvvi-calendar-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);

let isAdmin = false;
let modifiedDates = new Set();
let currentDate = new Date();
let events = {};

// 지연 로딩을 위한 상태 변수 추가
let loadedMonths = new Set();
let isSongbookLoaded = false;

let members = {};
let currentAMPM = '오전';
let activeMemoTab = '컨텐츠';
let activeDateId = '';
let pickerYear = currentDate.getFullYear();
let memoLoadToken = 0;

let favPlaylist = [];
let currentFavIndex = 0;
let isPlaying = false; 

window.extractYtId = function(url) {
    if(!url) return null;
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : null;
};
const extractYtId = window.extractYtId;

function updateFavPlayerPlaylist() {
    const favorites = getFavorites();
    favPlaylist = songbookSongs.filter(s => favorites.includes(s.id));
    
    const playerTitle = document.getElementById('playerTrackTitle');
    const playerArtist = document.getElementById('playerTrackArtist');
    const playerWrapper = document.getElementById('playerWrapper');
    const btn = document.getElementById('playPauseBtn');
    const visualizer = document.getElementById('visualizer');
    
    if (favPlaylist.length === 0) {
        if(playerTitle) playerTitle.innerText = "재생할 곡이 없습니다";
        if(playerArtist) playerArtist.innerText = "곡을 즐겨찾기 해보세요.";
        if(playerWrapper) playerWrapper.innerHTML = "";
        if(btn) btn.innerText = "▶";
        if(visualizer) visualizer.style.display = 'none';
        isPlaying = false;
        return;
    }
    
    if (currentFavIndex >= favPlaylist.length) currentFavIndex = 0;
    
    if(playerTitle) playerTitle.innerText = favPlaylist[currentFavIndex].title;
    if(playerArtist) playerArtist.innerText = favPlaylist[currentFavIndex].artist;
}
window.updateFavPlayerPlaylist = updateFavPlayerPlaylist;

window.toggleFavPlay = function() {
    if (favPlaylist.length === 0) return;
    
    const playerWrapper = document.getElementById('playerWrapper');
    const btn = document.getElementById('playPauseBtn'); 
    const visualizer = document.getElementById('visualizer');
    const currentSong = favPlaylist[currentFavIndex];

    if (isPlaying) {
        playerWrapper.innerHTML = ""; 
        playerWrapper.style.display = 'none';
        btn.innerText = "▶";
        visualizer.style.display = 'none';
        isPlaying = false;
        isMinimized = true;
        const btnMin = document.getElementById('btnMin');
        if (btnMin) {
            btnMin.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
        }
        showToast("정지되었습니다.");
    } else {
        let src = "";
        let iframeCode = "";

        if (currentSong.url.includes("sooplive.com/player/")) {
            const match = currentSong.url.match(/player\/(\d+)/);
            const videoId = match ? match[1] : currentSong.url.split('/').pop().split('?')[0];
            src = `https://vod.sooplive.com/player/${videoId}/embed?showChat=false&autoPlay=true&mutePlay=false`;
            iframeCode = `<iframe id="soop_player_video" width="100%" height="100%" src="${src}" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; web-share;"></iframe>`;
        } else if (extractYtId(currentSong.url)) {
            const videoId = extractYtId(currentSong.url);
            src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            iframeCode = `<iframe width="100%" height="100%" frameborder="0" src="${src}" allow="autoplay; clipboard-write; web-share" allowfullscreen="true"></iframe>`;
        } else {
            src = currentSong.url;
            iframeCode = `<iframe width="100%" height="100%" frameborder="0" src="${src}" allow="autoplay; clipboard-write; web-share" allowfullscreen="true"></iframe>`;
        }

        playerWrapper.innerHTML = iframeCode;
        playerWrapper.style.display = 'block';
        btn.innerText = "■";
        visualizer.style.display = 'block';
        isPlaying = true;
        isMinimized = false;
        const btnMin = document.getElementById('btnMin');
        if (btnMin) {
            btnMin.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
        }
    }
};

window.nextFavSong = function() {
    if (favPlaylist.length === 0) return;
    currentFavIndex = (currentFavIndex + 1) % favPlaylist.length;
    isPlaying = false; 
    updateFavPlayerPlaylist();
    toggleFavPlay(); 
};

window.prevFavSong = function() {
    if (favPlaylist.length === 0) return;
    currentFavIndex = (currentFavIndex - 1 + favPlaylist.length) % favPlaylist.length;
    isPlaying = false;
    updateFavPlayerPlaylist();
    toggleFavPlay(); 
};

window.updateFavPlayerUIAndPlay = function() {
    updateFavPlayerPlaylist();
};

let isMinimized = true;

window.toggleMinimize = function() {
    const playerWrapper = document.getElementById('playerWrapper');
    const visualizer = document.getElementById('visualizer');
    const btnMin = document.getElementById('btnMin');

    if (!playerWrapper || !btnMin) return;

    const isCurrentlyHidden = playerWrapper.style.display === 'none' || playerWrapper.style.display === '';

    if (isCurrentlyHidden) {
        playerWrapper.style.display = 'block';
        if (visualizer) {
            visualizer.style.display = isPlaying ? 'block' : 'none';
        }

        btnMin.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
        isMinimized = false;
    } else {
        playerWrapper.style.display = 'none';
        if (visualizer) {
            visualizer.style.display = isPlaying ? 'block' : 'none';
        }

        btnMin.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
        isMinimized = true;
    }
};

window.toggleScreen = function() {
    window.toggleMinimize();
};

function getFavorites() {
    try { return JSON.parse(localStorage.getItem('htvvi_favorites')) || []; } 
    catch(e) { return []; }
}

function getWeekOfMonth(date) {
    const target = new Date(date);
    const day = target.getDay();
    const diff = target.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(target.setDate(diff));
    
    const year = monday.getFullYear();
    const month = monday.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    let firstMonday = new Date(year, month, 1 - firstDayOfWeek);
    
    const diffTime = monday.getTime() - firstMonday.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const weekNo = Math.floor(diffDays / 7) + 1;
    
    return { month: month + 1, week: weekNo };
}

function toggleFavorite(event, id) {
    event.stopPropagation(); 
    let favorites = getFavorites();
    if (favorites.includes(id)) {
        favorites = favorites.filter(favId => favId !== id);
    } else {
        favorites.push(id);
    }
    localStorage.setItem('htvvi_favorites', JSON.stringify(favorites));
    renderSongbook(); 
    updateFavPlayerPlaylist(); 
}

async function handleEventImgUpload(input) {
    if (input.files && input.files[0]) {
        try {
            const file = input.files[0];
            showToast('일정 이미지를 업로드 중입니다...');
            const url = await uploadFileToStorage(file, `event-images/${Date.now()}_${file.name}`);
            document.getElementById('eventImageUrl').value = url;
            showToast('일정 이미지가 Firebase에 업로드되었습니다.');
        } catch (error) { console.error(error); showToast('일정 이미지 업로드에 실패했습니다.'); }
    }
}

async function handleMemberImgUpload(input) {
    if (input.files && input.files[0]) {
        try {
            const file = input.files[0];
            showToast('멤버 이미지를 업로드 중입니다...');
            const url = await uploadFileToStorage(file, `member-images/${Date.now()}_${file.name}`);
            document.getElementById('newMemberImg').value = url;
            showToast('멤버 이미지가 Firebase에 업로드되었습니다.');
        } catch (error) { console.error(error); showToast('멤버 이미지 업로드에 실패했습니다.'); }
    }
}

async function addMember() {
    const name = document.getElementById('newMemberName').value.trim();
    const soopId = document.getElementById('newMemberId').value.trim();

    if (!name) return showToast('닉네임을 입력해주세요.');
    if (!soopId) return showToast('SOOP 아이디를 입력해주세요.');

    // SOOP 아이디 기반 이미지 URL 생성
    const prefix = soopId.substring(0, 2).toLowerCase();
    const img = `https://stimg.sooplive.com/LOGO/${prefix}/${soopId}/${soopId}.jpg`;

    const id = `member_${encodeURIComponent(name)}`;
    const data = { name, img, soopId };

    try {
    await setDoc(doc(db, 'members', id), data);
    await loadMembersFromFirebase();
    document.getElementById('newMemberName').value = '';
    document.getElementById('newMemberId').value = '';
    renderMemberList();
    showToast(`${name} 멤버가 추가되었습니다.`);
} catch (error) { 
    console.error(error); 
    showToast(`멤버 저장 실패: ${error.message}`); 
}
}

function deleteMember(name) {
    const btn = document.getElementById('confirmBtn');
    document.getElementById('confirmMessage').innerText = `[${name}] 멤버를 삭제할까요?`;
    btn.onclick = async () => {
        try {
            await deleteDoc(doc(db, 'members', `member_${encodeURIComponent(name)}`));
            delete members[name];
            renderMemberList();
            closeModal('confirmModal');
            showToast(`${name} 멤버가 삭제되었습니다.`);
        } catch (error) { console.error(error); showToast('멤버 삭제에 실패했습니다.'); }
    };
    document.getElementById('confirmModal').style.display = 'flex';
}

function openMemberManager() { renderMemberList(); document.getElementById('memberModal').style.display = 'flex'; }

function renderMemberList() {
    const list = document.getElementById('memberList');
    list.innerHTML = '';
    Object.values(members).forEach(m => {
        const item = document.createElement('div');
        item.className = 'member-list-item';
        item.innerHTML = `<img src="${m.img}" class="member-img-preview" onerror="this.src='https://placehold.co/100x100?text=?'"><div style="flex:1; font-weight:800;">${m.name}</div><button class="text-red-400 font-bold" onclick="deleteMember('${m.name}')">삭제</button>`;
        list.appendChild(item);
    });
}

function showToast(msg) {
    const toast = document.getElementById('toastMessage');
    toast.innerText = msg; toast.style.display = 'block';
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => { toast.style.display = 'none'; }, 2500);
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function formatTime12h(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    return `${h >= 12 ? '오후' : '오전'} ${h % 12 || 12}:${m.toString().padStart(2, '0')}`;
}

function setAMPM(val) {
    currentAMPM = val;
    document.getElementById('ampmAM').classList.toggle('active', val === '오전');
    document.getElementById('ampmPM').classList.toggle('active', val === '오후');
}

async function uploadFileToStorage(file, path) {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}

async function loadMembersFromFirebase() {
    members = {};
    const snapshot = await getDocs(collection(db, 'members'));
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (!data || !data.name) return;
        members[data.name] = { name: data.name, img: data.img || `https://placehold.co/100x100/FFD54F/ffffff?text=${encodeURIComponent(data.name[0] || '')}` };
    });
}

// 특정 연/월의 이벤트만 가져오기 기능
async function loadEventsForMonth(year, month) {
    const monthKey = `${year}-${month}`;
    if (loadedMonths.has(monthKey)) return;

    const q = query(
        collection(db, 'events'),
        where('dateId', '>=', `${year}-${month}-`),
        where('dateId', '<=', `${year}-${month}-\uf8ff`)
    );

    const snapshot = await getDocs(q);
    const docs = [];
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (!data || !data.dateId) return;
        docs.push({ ...data, id: docSnap.id });
    });

    docs.sort((a, b) => {
        const dateA = new Date(a.startDate || a.dateId).getTime();
        const dateB = new Date(b.startDate || b.dateId).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return (a.order ?? 9999) - (b.order ?? 9999);
    });

    docs.forEach(data => {
        if (!events[data.dateId]) events[data.dateId] = [];
        if (!events[data.dateId].some(e => e.id === data.id)) {
            events[data.dateId].push(data);
        }
    });

    loadedMonths.add(monthKey);
}

// 필요한 월이 로드되었는지 확인하는 함수
async function ensureMonthsLoadedForDate(date) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    await loadEventsForMonth(y, m);

    const isMobile = window.innerWidth < 768;
    if (isMobile) {
        const target = new Date(date);
        const dayNum = target.getDay();
        const diff = target.getDate() - dayNum + (dayNum === 0 ? -6 : 1);
        const monday = new Date(target.setDate(diff));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        if (monday.getMonth() !== date.getMonth()) {
            await loadEventsForMonth(monday.getFullYear(), monday.getMonth() + 1);
        }
        if (sunday.getMonth() !== date.getMonth()) {
            await loadEventsForMonth(sunday.getFullYear(), sunday.getMonth() + 1);
        }
    }
}

async function loadData() {
    try { 
        await Promise.all([loadMembersFromFirebase(), loadMemos()]); 
    }
    catch (error) { console.error(error); }
}

function openAddModal(id) {
    activeDateId = id; document.getElementById('modalTitle').innerText = '일정 추가';
    document.getElementById('editIndex').value = '-1';
    if (document.getElementById('editingEventDocId')) document.getElementById('editingEventDocId').value = '';
    document.getElementById('eventTitle').value = '';
    document.getElementById('timeHour').value = ''; document.getElementById('timeMin').value = '';
    document.getElementById('eventImageUrl').value = ''; document.getElementById('eventImgFile').value = '';
    document.getElementById('eventMembers').value = ''; document.getElementById('eventNoticeLink').value = ''; document.getElementById('eventType').value = '개인방송';
    
    const pad = (n) => n.toString().padStart(2, '0');
    if (document.getElementById('eventStartDate')) {
        const parts = id.split('-');
        const y = parts[0]; const m = pad(parseInt(parts[1], 10)); const d = pad(parseInt(parts[2], 10));
        document.getElementById('eventStartDate').value = `${y}-${m}-${d}`;
        document.getElementById('eventEndDate').value = `${y}-${m}-${d}`;
    }
    setAMPM('오전'); document.getElementById('delBtn').style.display = 'none';
    document.getElementById('eventModal').style.display = 'flex';
}

function openEditModal(id, idx) {
    activeDateId = id;
    const ev = events[id][idx];
    document.getElementById('modalTitle').innerText = '일정 수정';
    document.getElementById('editIndex').value = idx;
    if (document.getElementById('editingEventDocId')) document.getElementById('editingEventDocId').value = ev.id || '';
    document.getElementById('eventTitle').value = ev.title;
    document.getElementById('eventType').value = ev.type;
    document.getElementById('eventMembers').value = ev.members || '';
    document.getElementById('eventNoticeLink').value = ev.noticeLink || '';
    document.getElementById('eventImageUrl').value = ev.imageUrl || '';
    
    if (document.getElementById('eventStartDate')) {
        if (ev.startDate) {
            const s = new Date(ev.startDate);
            document.getElementById('eventStartDate').value = `${s.getFullYear()}-${(s.getMonth()+1).toString().padStart(2,'0')}-${s.getDate().toString().padStart(2,'0')}`;
        } else if (ev.dateId) {
            const parts = ev.dateId.split('-');
            document.getElementById('eventStartDate').value = `${parts[0]}-${parts[1].toString().padStart(2,'0')}-${parts[2].toString().padStart(2,'0')}`;
        }
        if (ev.endDate) {
            const e = new Date(ev.endDate);
            document.getElementById('eventEndDate').value = `${e.getFullYear()}-${(e.getMonth()+1).toString().padStart(2,'0')}-${e.getDate().toString().padStart(2,'0')}`;
        } else if (ev.dateId) {
            const parts = ev.dateId.split('-');
            document.getElementById('eventEndDate').value = `${parts[0]}-${parts[1].toString().padStart(2,'0')}-${parts[2].toString().padStart(2,'0')}`;
        }
    }
    if (ev.time) {
        const [h, m] = ev.time.split(':').map(Number);
        setAMPM(h >= 12 ? '오후' : '오전');
        document.getElementById('timeHour').value = h % 12 || 12;
        document.getElementById('timeMin').value = m.toString().padStart(2, '0');
    }
    document.getElementById('delBtn').style.display = 'block';
    document.getElementById('eventModal').style.display = 'flex';
}

async function saveEvent() {
    const title = document.getElementById('eventTitle').value.trim();
    if (!title) return showToast('제목을 입력하세요.');
    const hRaw = document.getElementById('timeHour').value;
    const mRaw = document.getElementById('timeMin').value;
    let timeStr = '';
    if (hRaw !== '') {
        let h = parseInt(hRaw, 10);
        const m = parseInt(mRaw || '0', 10);
        if (currentAMPM === '오후' && h < 12) h += 12;
        if (currentAMPM === '오전' && h === 12) h = 0;
        timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    const startStr = document.getElementById('eventStartDate').value;
    const endStr = document.getElementById('eventEndDate').value;
    const type = document.getElementById('eventType').value;
    const members = document.getElementById('eventMembers').value;
    const noticeLink = document.getElementById('eventNoticeLink').value.trim();
    const imageUrl = document.getElementById('eventImageUrl').value;

    const editingDocId = document.getElementById('editingEventDocId').value;
    const isEditing = editingDocId !== '';

    try {
        const data = {
            title,
            time: timeStr,
            type,
            members,
            noticeLink,
            imageUrl,
            dateId: activeDateId,
            startDate: startStr,
            endDate: endStr,
        };

        if (isEditing) {
            await setDoc(doc(db, 'events', editingDocId), data);
            showToast('일정이 수정되었습니다.');
        } else {
            const sDate = new Date(startStr);
            const eDate = new Date(endStr);
            for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
                const dateId = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
                await addDoc(collection(db, 'events'), { ...data, dateId });
            }
            showToast('일정이 추가되었습니다.');
        }

        // 저장 후 관련 캘린더 캐시 클리어 후 리로드
        loadedMonths.clear();
        events = {};
        await ensureMonthsLoadedForDate(currentDate);

        document.getElementById('editingEventDocId').value = '';
        document.getElementById('editIndex').value = '-1';
        closeModal('eventModal'); renderCalendar();
    } catch (error) { console.error(error); showToast(`저장 실패: ${error.message}`); }
}

async function deleteEvent() {
    const idx = parseInt(document.getElementById('editIndex').value, 10);
    if (!confirm('이 일정을 삭제할까요?')) return;
    try {
        const editingDocId = document.getElementById('editingEventDocId') ? document.getElementById('editingEventDocId').value : '';
        if (editingDocId) {
            await deleteDoc(doc(db, 'events', editingDocId));
        } else {
            const existingEvent = events[activeDateId] && events[activeDateId][idx];
            if (existingEvent && existingEvent.id) await deleteDoc(doc(db, 'events', existingEvent.id));
        }
        
        // 삭제 후 관련 캘린더 캐시 클리어 후 리로드
        loadedMonths.clear();
        events = {};
        await ensureMonthsLoadedForDate(currentDate);

        if (document.getElementById('editingEventDocId')) document.getElementById('editingEventDocId').value = '';
        closeModal('eventModal'); renderCalendar(); showToast('일정이 삭제되었습니다.');
    } catch (error) { console.error(error); showToast('일정 삭제에 실패했습니다.'); }
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';
    
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
        grid.className = 'calendar-grid weekly-view';
        
        const target = new Date(currentDate);
        const dayNum = target.getDay();
        const diff = target.getDate() - dayNum + (dayNum === 0 ? -6 : 1);
        const monday = new Date(target.setDate(diff));
        
        const { month, week } = getWeekOfMonth(currentDate);
        document.getElementById('monthDisplay').innerText = `${currentDate.getFullYear()}년 ${month}월 ${week}째주`;
        
        const yoils = ['월', '화', '수', '목', '금', '토', '일'];
        const yoilColors = ['', '', '', '', '', 'text-blue-500', 'text-red-500'];
        
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(monday);
            dayDate.setDate(monday.getDate() + i);
            
            const num = dayDate.getDate();
            const m = dayDate.getMonth() + 1;
            const y = dayDate.getFullYear();
            const dateId = `${y}-${m}-${num}`;
            
            const row = document.createElement('div');
            row.className = 'week-row';
            if (isAdmin) {
                row.onclick = () => openAddModal(dateId);
            }
            
            const dayLabel = document.createElement('div');
            dayLabel.className = 'week-day-label';
            
            const dayName = document.createElement('span');
            dayName.className = `week-day-name ${yoilColors[i] || ''}`;
            dayName.innerText = yoils[i];
            
            const dayNumber = document.createElement('span');
            const today = new Date();
            const isToday = dayDate.getDate() === today.getDate() && dayDate.getMonth() === today.getMonth() && dayDate.getFullYear() === today.getFullYear();
            
            if (isToday) {
                dayNumber.className = 'today-circle';
                dayNumber.innerText = num;
            } else {
                dayNumber.className = `week-day-num ${yoilColors[i] || ''}`;
                dayNumber.innerText = num;
            }
            
            dayLabel.appendChild(dayName);
            dayLabel.appendChild(dayNumber);
            
            const eventsDiv = document.createElement('div');
            eventsDiv.className = 'week-events';
            
            if (events[dateId] && events[dateId].length > 0) {
                events[dateId].forEach((ev, idx) => {
                    const isLong = ev.startDate && ev.endDate && (new Date(ev.endDate) > new Date(ev.startDate));
                    const tag = document.createElement('div');
                    tag.className = `event-tag type-${ev.type}${isLong ? ' long-term' : ''}`;
                    tag.innerHTML = `${ev.time ? `<span class="event-time-badge">${formatTime12h(ev.time)}</span>` : ''}<div style="flex: 1; display: flex; align-items: center; justify-content: center; width: 100%; line-height: 1.2; word-break: break-word;">${ev.title}</div>`;
                    tag.onclick = (e) => { e.stopPropagation(); showInfo(dateId, idx); };
                    if (isAdmin) {
                        tag.oncontextmenu = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openEditModal(dateId, idx);
                        };
                    }
                    eventsDiv.appendChild(tag);
                });
            } else {
                const noEvent = document.createElement('div');
                noEvent.className = 'week-no-event';
                noEvent.innerText = '등록된 일정이 없습니다.';
                eventsDiv.appendChild(noEvent);
            }
            
            row.appendChild(dayLabel);
            row.appendChild(eventsDiv);
            grid.appendChild(row);
        }
    } else {
        grid.className = 'calendar-grid';
        grid.innerHTML = `<div class="day-label">월</div><div class="day-label">화</div><div class="day-label">수</div><div class="day-label">목</div><div class="day-label">금</div><div class="day-label text-blue-400">토</div><div class="day-label text-red-400">일</div>`;
        
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        document.getElementById('monthDisplay').innerText = `${y}년 ${m + 1}월`;
        
        const firstDay = new Date(y, m, 1);
        const lastDay = new Date(y, m + 1, 0);
        const startIdx = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        const prevLastDay = new Date(y, m, 0).getDate();
        
        for (let i = startIdx; i > 0; i--) createDay(prevLastDay - i + 1, false);
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const d = new Date(y, m, i);
            const dateId = `${y}-${m + 1}-${i}`;
            const allEvents = Object.values(events).flat();
            const todaysEvents = allEvents.filter(ev => {
                if (!ev.startDate) return ev.dateId === dateId;
                const start = new Date(ev.startDate);
                const end = new Date(ev.endDate);
                start.setHours(0,0,0,0);
                end.setHours(0,0,0,0);
                return d >= start && d <= end;
            });
            createDay(i, true, todaysEvents);
        }
    }
    applyDraggable();
    updateAdminUI(); updateSummary();
}

function applyDraggable() {
    const isDraggable = isAdmin;

    const sortableOptions = {
        animation: 150,
        ghostClass: 'dragging-ghost',
        fallbackOnBody: true,
        disabled: !isDraggable,
        onStart: function(evt) {
            evt.item.style.height = evt.item.offsetHeight + 'px';
        },
        onEnd: function (evt) {
            evt.item.style.height = '';
            if (!isAdmin) return;

            const dateId = evt.to.closest('.day')?.dataset.dateId || evt.to.parentElement.closest('.week-row')?.dataset.dateId;
            if (dateId) modifiedDates.add(dateId);
        }
    };

    document.querySelectorAll('.event-container, .week-events').forEach(el => {
        if (el.sortableInstance) {
            el.sortableInstance.option('disabled', !isDraggable);
        } else {
            el.sortableInstance = new Sortable(el, sortableOptions);
        }
    });
}

function createDay(num, isCurr, dayEvents = []) {
    const dateId = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${num}`;
    const div = document.createElement('div');
    div.dataset.dateId = dateId;
    div.className = 'day' + (isCurr ? '' : ' not-current');
    const numDiv = document.createElement('div');
    numDiv.className = 'day-num';
    const today = new Date();
    const isToday = isCurr && today.getDate() === num && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
    numDiv.innerHTML = isCurr ? (isToday ? `<span class="today-circle">${num}</span>` : num) : '';
    div.appendChild(numDiv);
    const evCont = document.createElement('div');
    evCont.className = 'event-container';
    if (isCurr && dayEvents && dayEvents.length > 0) {
        dayEvents.forEach((ev, idx) => {
            const isLong = ev.startDate && ev.endDate && (new Date(ev.endDate) > new Date(ev.startDate));
            const tag = document.createElement('div');
            tag.className = `event-tag type-${ev.type}${isLong ? ' long-term' : ''}`;
            tag.dataset.id = ev.id;
            tag.innerHTML = `${ev.time ? `<span class="event-time-badge">${formatTime12h(ev.time)}</span>` : ''}<div style="flex: 1; display: flex; align-items: center; justify-content: center; width: 100%; line-height: 1.2; word-break: break-word;">${ev.title}</div>`;
            tag.onclick = (e) => { e.stopPropagation(); showInfoByEvent(ev); };
            if (isAdmin) tag.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); openEditModalByEvent(ev); };
            evCont.appendChild(tag);
        });
    }
    div.appendChild(evCont);
    if (isCurr && isAdmin) div.onclick = () => openAddModal(dateId);
    document.getElementById('calendarGrid').appendChild(div);
}

function showInfo(id, idx) {
    const ev = events[id]?.[idx];
    if (!ev) return;

    document.getElementById('infoTitle').innerText = ev.title;

    let dateText = '';
    if (ev.startDate && ev.endDate) {
        const s = new Date(ev.startDate);
        const e = new Date(ev.endDate);
        const startText = `${s.getFullYear().toString().slice(-2)}.${s.getMonth()+1}.${s.getDate()}`;
        const endText = `${e.getFullYear().toString().slice(-2)}.${e.getMonth()+1}.${e.getDate()}`;
        dateText = startText;
        if (ev.startDate !== ev.endDate) {
            dateText = `${startText} - ${endText}`;
        }
        if (ev.time) dateText += ` | ${formatTime12h(ev.time)}`;
    } else if (ev.dateId) {
        const parts = ev.dateId.split('-');
        dateText = `${parts[0].slice(-2)}.${parts[1]}.${parts[2]}`;
        if (ev.time) dateText += ` | ${formatTime12h(ev.time)}`;
    } else {
        dateText = ev.time ? formatTime12h(ev.time) : '시간 미정';
    }

    document.getElementById('infoTime').innerText = dateText;

    const infoImageContainer = document.getElementById('infoImageContainer');
    infoImageContainer.innerHTML = '';
    if (ev.imageUrl) {
        const img = document.createElement('img');
        img.src = ev.imageUrl;
        img.alt = ev.title;
        img.className = 'info-image';
        img.onload = () => {
            infoImageContainer.innerHTML = '';
            infoImageContainer.appendChild(img);
        };
        img.onerror = () => {
            infoImageContainer.innerHTML = `<a class="info-link" href="${ev.imageUrl}" target="_blank" rel="noopener noreferrer">이미지 보기</a>`;
        };
        infoImageContainer.appendChild(img);
    }
    const profs = document.getElementById('infoProfiles');
    profs.innerHTML = '';
    if (ev.members) {
        ev.members.split(',').forEach(nameRaw => {
            const name = nameRaw.trim();
            if (!name) return;
            const m = members[name] || { name, img: `https://placehold.co/100x100?text=${encodeURIComponent(name[0] || '')}` };
            const card = document.createElement('div');
            card.className = 'profile-card';
            card.innerHTML = `<img src="${m.img}" class="profile-img" onerror="this.src='https://placehold.co/100x100?text=?'"><div class="profile-name">${m.name}</div>`;
            profs.appendChild(card);
        });
    }
    const noticeBtn = document.getElementById('infoNoticeBtn');
    if (ev.noticeLink) {
        noticeBtn.style.display = 'block';
        noticeBtn.onclick = () => window.open(ev.noticeLink, '_blank');
    } else {
        noticeBtn.style.display = 'none';
    }
    document.getElementById('infoModal').style.display = 'flex';
}

function showInfoByEvent(ev) {
    if (!ev) return;
    document.getElementById('infoTitle').innerText = ev.title;
    let dateText = '';
    if (ev.startDate && ev.endDate) {
        const s = new Date(ev.startDate); const e = new Date(ev.endDate);
        dateText = `${s.getFullYear().toString().slice(-2)}.${s.getMonth()+1}.${s.getDate()}${(ev.time ? ` | ${formatTime12h(ev.time)}` : '')}`;
        if (ev.startDate !== ev.endDate) dateText = `${s.getFullYear().toString().slice(-2)}.${s.getMonth()+1}.${s.getDate()} - ${e.getFullYear().toString().slice(-2)}.${e.getMonth()+1}.${e.getDate()}${(ev.time ? ` | ${formatTime12h(ev.time)}` : '')}`;
    } else if (ev.dateId) {
        const parts = ev.dateId.split('-');
        dateText = `${parts[0].slice(-2)}.${parts[1]}.${parts[2]}${(ev.time ? ` | ${formatTime12h(ev.time)}` : '')}`;
    } else {
        dateText = ev.time ? formatTime12h(ev.time) : '시간 미정';
    }
    document.getElementById('infoTime').innerText = dateText;
    const infoImageContainer = document.getElementById('infoImageContainer');
    infoImageContainer.innerHTML = '';
    if (ev.imageUrl) {
        const img = document.createElement('img');
        img.src = ev.imageUrl; img.alt = ev.title; img.className = 'info-image';
        img.onload = () => { infoImageContainer.innerHTML = ''; infoImageContainer.appendChild(img); };
        img.onerror = () => { infoImageContainer.innerHTML = `<a class="info-link" href="${ev.imageUrl}" target="_blank" rel="noopener noreferrer">이미지 보기</a>`; };
        infoImageContainer.appendChild(img);
    }
    const profs = document.getElementById('infoProfiles');
    profs.innerHTML = '';
    if (ev.members) {
        ev.members.split(',').forEach(nameRaw => {
            const name = nameRaw.trim(); if (!name) return;
            const m = members[name] || { name, img: `https://placehold.co/100x100?text=${encodeURIComponent(name[0] || '')}` };
            const card = document.createElement('div');
            card.className = 'profile-card';
            card.innerHTML = `<img src="${m.img}" class="profile-img" onerror="this.src='https://placehold.co/100x100?text=?'"><div class="profile-name">${m.name}</div>`;
            profs.appendChild(card);
        });
    }
    const noticeBtn = document.getElementById('infoNoticeBtn');
    if (ev.noticeLink) {
        noticeBtn.style.display = 'block';
        noticeBtn.onclick = () => window.open(ev.noticeLink, '_blank');
    } else noticeBtn.style.display = 'none';
    document.getElementById('infoModal').style.display = 'flex';
}

function openEditModalByEvent(ev) {
    if (!ev) return;
    activeDateId = ev.dateId || (ev.startDate ? ev.startDate : activeDateId);
    document.getElementById('modalTitle').innerText = '일정 수정';
    document.getElementById('editIndex').value = '0';
    if (document.getElementById('editingEventDocId')) document.getElementById('editingEventDocId').value = ev.id || '';
    document.getElementById('eventTitle').value = ev.title || '';
    document.getElementById('eventType').value = ev.type || '개인방송';
    document.getElementById('eventMembers').value = ev.members || '';
    document.getElementById('eventNoticeLink').value = ev.noticeLink || '';
    document.getElementById('eventImageUrl').value = ev.imageUrl || '';
    if (ev.time) {
        const [h, m] = ev.time.split(':').map(Number);
        setAMPM(h >= 12 ? '오후' : '오전');
        document.getElementById('timeHour').value = h % 12 || 12;
        document.getElementById('timeMin').value = m.toString().padStart(2, '0');
    } else {
        setAMPM('오전'); document.getElementById('timeHour').value = ''; document.getElementById('timeMin').value = '';
    }
    if (document.getElementById('eventStartDate')) {
        if (ev.startDate) {
            const s = new Date(ev.startDate);
            document.getElementById('eventStartDate').value = `${s.getFullYear()}-${(s.getMonth()+1).toString().padStart(2,'0')}-${s.getDate().toString().padStart(2,'0')}`;
        } else if (ev.dateId) {
            const parts = ev.dateId.split('-');
            document.getElementById('eventStartDate').value = `${parts[0]}-${parts[1].toString().padStart(2,'0')}-${parts[2].toString().padStart(2,'0')}`;
        }
        if (ev.endDate) {
            const e = new Date(ev.endDate);
            document.getElementById('eventEndDate').value = `${e.getFullYear()}-${(e.getMonth()+1).toString().padStart(2,'0')}-${e.getDate().toString().padStart(2,'0')}`;
        } else if (ev.dateId) {
            const parts = ev.dateId.split('-');
            document.getElementById('eventEndDate').value = `${parts[0]}-${parts[1].toString().padStart(2,'0')}-${parts[2].toString().padStart(2,'0')}`;
        }
    }
    document.getElementById('delBtn').style.display = 'block';
    document.getElementById('eventModal').style.display = 'flex';
}

function updateSummary() {
    const today = new Date();
    const id = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    const cont = document.getElementById('summaryContent');
    cont.innerHTML = '';
    if (events[id] && events[id].length > 0) {
        events[id].forEach((ev, idx) => {
            const item = document.createElement('div');
            item.className = 'summary-item';
            item.onclick = () => showInfo(id, idx);
            item.innerHTML = `<span class="summary-dot type-dot-${ev.type.replace(/\s+/g, '')}"></span><span class="summary-title">${ev.title}</span>${ev.time ? `<span class="summary-time">${formatTime12h(ev.time)}</span>` : ''}`;
            cont.appendChild(item);
        });
    } else cont.innerHTML = "<p class='text-gray-400 font-bold'>오늘은 일정이 없습니다.</p>";
}

function toggleMemo() {
    const panel = document.getElementById('memoPanel');
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
        updateMemoTabUI();
        loadMemos();
    }
}

function selectMemoTab(tab) {
    activeMemoTab = tab;
    updateMemoTabUI();
    loadMemos();
}

function updateMemoTabUI() {
    document.querySelectorAll('.memo-tab').forEach(btn => {
        btn.classList.toggle('memo-tab-active', btn.dataset.tab === activeMemoTab);
    });
}

function openMemoInput() {
    if (!isAdmin) return;
    document.getElementById('memoInputArea').classList.remove('hidden');
    document.getElementById('memoItemText').focus();
}

function closeMemoInput() {
    const input = document.getElementById('memoItemText');
    if (input) input.value = '';
    document.getElementById('memoDateInput').value = '';
    document.getElementById('memoTimeInput').value = '';
    document.getElementById('memoInputArea').classList.add('hidden');
}

async function saveMemoItem() {
    if (!isAdmin) return;
    const input = document.getElementById('memoItemText');
    const dateInput = document.getElementById('memoDateInput');
    const timeInput = document.getElementById('memoTimeInput');
    
    const text = input.value.trim();
    const dateVal = dateInput.value;
    const timeVal = timeInput.value;

    if (!text) return showToast('메모 내용을 입력하세요.');
    try {
        await addDoc(collection(db, 'memos_list'), { 
            text, 
            tab: activeMemoTab, 
            date: dateVal,
            time: timeVal,
            createdAt: new Date() 
        });
        input.value = '';
        dateInput.value = '';
        timeInput.value = '';
        closeMemoInput();
        loadMemos();
        showToast('메모가 추가되었습니다.');
    } catch (error) {
        console.error('메모 추가 실패:', error);
        showToast('메모 추가에 실패했습니다.');
    }
}

async function loadMemos() {
    const list = document.getElementById('memoList');
    list.innerHTML = '';
    const currentLoad = ++memoLoadToken;
    
    const snapshot = await getDocs(collection(db, "memos_list"));
    if (currentLoad !== memoLoadToken) return;
    
    let memos = [];
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.tab === activeMemoTab) {
            memos.push({ id: docSnap.id, ...data });
        }
    });

    memos.sort((a, b) => {
        const hasDateTimeA = !!(a.date || a.time);
        const hasDateTimeB = !!(b.date || b.time);

        if (hasDateTimeA && hasDateTimeB) {
            const dateA = a.date || '9999-12-31';
            const timeA = a.time || '23:59';
            const dtA = `${dateA}T${timeA}`;

            const dateB = b.date || '9999-12-31';
            const timeB = b.time || '23:59';
            const dtB = `${dateB}T${timeB}`;

            return dtA.localeCompare(dtB); 
        } else if (hasDateTimeA && !hasDateTimeB) {
            return -1; 
        } else if (!hasDateTimeA && hasDateTimeB) {
            return 1;
        } else {
            const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return tB - tA; 
        }
    });
    
    memos.forEach(data => {
        let dateTimeStr = '';
        if (data.date || data.time) {
            let parts = [];
            if (data.date) {
                const dParts = data.date.split('-');
                if(dParts.length === 3) parts.push(`${dParts[0].slice(-2)}.${dParts[1]}.${dParts[2]}`);
                else parts.push(data.date);
            }
            if (data.time) {
                parts.push(formatTime12h(data.time));
            }
            dateTimeStr = `<div class="memo-datetime">${parts.join(' ')}</div>`;
        }

        const entry = document.createElement('div');
        entry.className = 'memo-item-entry';
        
        entry.innerHTML = `
            <div class="memo-content-wrapper">
                ${dateTimeStr}
                <div class="memo-text-content">${data.text}</div>
            </div>
            ${isAdmin ? `<button class="memo-item-delete" onclick="deleteMemo('${data.id}')">✕</button>` : ''}
        `;
        
        list.appendChild(entry);
    });
}

window.deleteMemo = async (id) => {
    if (!isAdmin) {
        showToast('관리자만 삭제할 수 있습니다.');
        return;
    }
    if(confirm('이 메모를 삭제하시겠습니까?')) {
        try {
            await deleteDoc(doc(db, "memos_list", id));
            loadMemos();
            showToast('메모가 삭제되었습니다.');
        } catch (error) {
            console.error('메모 삭제 실패:', error);
            showToast('메모 삭제에 실패했습니다.');
        }
    }
};

window.moveMonth = async function(v) {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
        const target = new Date(currentDate);
        const dayNum = target.getDay();
        const diff = target.getDate() - dayNum + (dayNum === 0 ? -6 : 1);
        const monday = new Date(target.setDate(diff));
        monday.setDate(monday.getDate() + (v * 7));
        currentDate = monday;
    } else {
        currentDate.setMonth(currentDate.getMonth() + v);
    }
    await ensureMonthsLoadedForDate(currentDate);
    renderCalendar();
}

function openMonthPicker() { pickerYear = currentDate.getFullYear(); updatePickerUI(); document.getElementById('monthPickerModal').style.display = 'flex'; }

function updatePickerUI() {
    document.getElementById('pickerYearDisplay').innerText = `${pickerYear}년`;
    const grid = document.querySelector('.month-picker-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 12; i++) {
        const btn = document.createElement('button');
        btn.className = 'month-btn';
        btn.innerText = `${i + 1}월`;
        if (pickerYear === currentDate.getFullYear() && i === currentDate.getMonth()) btn.classList.add('active');
        btn.onclick = () => selectMonth(i);
        grid.appendChild(btn);
    }
}

function changePickerYear(offset) { pickerYear += offset; updatePickerUI(); }

window.selectMonth = async function(m) { 
    currentDate.setFullYear(pickerYear); 
    currentDate.setMonth(m); 
    closeModal('monthPickerModal'); 
    await ensureMonthsLoadedForDate(currentDate);
    renderCalendar(); 
}

async function promptAdmin() {
    if (isAdmin) {
        if (modifiedDates.size > 0) {
            if (confirm("순서 변경 사항이 있습니다. 저장하시겠습니까?")) {
                await saveAllModifiedOrders();
            }
        }
        isAdmin = false;
        modifiedDates.clear();
        updateAdminUI();
        renderCalendar();
        showToast('관리자 모드 해제');
    }
    else {
        document.getElementById('adminPw').value = '';
        document.getElementById('pwError').classList.add('hidden');
        document.getElementById('pwModal').style.display = 'flex';
    }
}

async function saveAllModifiedOrders() {
    showToast('순서를 서버에 저장 중입니다...');
    const updatePromises = [];

    for (const dateId of modifiedDates) {
        const container = document.querySelector(`[data-date-id="${dateId}"] .event-container`) ||
                          document.querySelector(`[data-date-id="${dateId}"] .week-events`);
        if (container) {
            const items = container.querySelectorAll('.event-tag');
            items.forEach((item, index) => {
                const docId = item.dataset.id;
                if (docId) {
                    updatePromises.push(updateDoc(doc(db, 'events', docId), { order: index }));
                }
            });
        }
    }

    await Promise.all(updatePromises);
    modifiedDates.clear();
    showToast('모든 순서가 저장되었습니다.');
}

function loginAdmin() {
    if (document.getElementById('adminPw').value === '0112') {
        isAdmin = true; closeModal('pwModal'); updateAdminUI(); renderCalendar(); showToast('관리자 인증 성공!');
    } else document.getElementById('pwError').classList.remove('hidden');
}

function updateMemoEditState() {
    const memoInput = document.getElementById('memoItemText');
    if (!memoInput) return;
    memoInput.disabled = !isAdmin;
}

function updateAdminUI() {
    document.querySelectorAll('.admin-only-btn').forEach(b => b.classList.toggle('admin-visible', isAdmin));
    document.getElementById('adminBtn').classList.toggle('admin-active', isAdmin);
    applyDraggable();
    updateMemoEditState();
    updateSongbookAdminUI();
    const memoPanel = document.getElementById('memoPanel');
    if (memoPanel && memoPanel.classList.contains('open')) {
        loadMemos();
    }
}

let songbookSongs = [];
let songbookCurrentFilter = 'All';
let songbookSearchTerm = '';
let songbookIsEditing = null;
let currentModalSongId = null;

async function loadSongbookSongs() {
    songbookSongs = [];
    try {
        const snapshot = await getDocs(collection(db, 'songbook_songs'));
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data && data.title && data.artist) {
                songbookSongs.push({ 
                    id: docSnap.id, 
                    title: data.title, 
                    artist: data.artist, 
                    url: data.url || '',
                    isConditionSong: data.isConditionSong || false
                });
            }
        });
        songbookSongs.sort((a, b) => {
            const titleCompare = a.title.localeCompare(b.title, 'ko', { sensitivity: 'base' });
            if (titleCompare !== 0) return titleCompare;
            return a.artist.localeCompare(b.artist, 'ko', { sensitivity: 'base' });
        });
    } catch (error) {
        console.error('노래 데이터 로드 실패:', error);
    }
}

function renderSongbook() {
    const songListDiv = document.getElementById('songList');
    const artistListDiv = document.getElementById('artistList');
    
    songListDiv.innerHTML = '';
    songbookSearchTerm = document.getElementById('songbookSearch').value.trim().toLowerCase();
    
    const favorites = getFavorites();

    const filtered = songbookSongs.filter(song => {
        let matchesFilter = false;
        if (songbookCurrentFilter === 'Favorites') {
            matchesFilter = favorites.includes(song.id);
        } else {
            matchesFilter = songbookCurrentFilter === 'All' || song.artist === songbookCurrentFilter;
        }
        const matchesSearch = !songbookSearchTerm || song.title.toLowerCase().includes(songbookSearchTerm) || song.artist.toLowerCase().includes(songbookSearchTerm);
        return matchesFilter && matchesSearch;
    });

    const starSolid = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clip-rule="evenodd" /></svg>`;
    const starOutline = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="28" height="28"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>`;

    filtered.forEach(song => {
        const isFav = favorites.includes(song.id);
        const favIcon = isFav ? starSolid : starOutline;
        const favClass = isFav ? 'is-favorite' : '';
        
        const safeUrl = song.url ? song.url.replace(/'/g, "\\'") : '';
        const safeTitle = song.title ? song.title.replace(/'/g, "\\'") : '';

        const conditionBadge = song.isConditionSong ? `<span class="condition-badge">컨디션곡</span>` : '';

        songListDiv.innerHTML += `
            <div class="song-item" oncontextmenu="editSong(event, '${song.id}')">
                <div class="song-item-left">
                    <button class="favorite-btn ${favClass}" onclick="toggleFavorite(event, '${song.id}')" title="즐겨찾기">${favIcon}</button>
                </div>
                <div class="song-clickable" onclick="openBrowser('${safeUrl}', '${song.id}', '${safeTitle}')" style="align-items: flex-start; justify-content: center; overflow: hidden;">
                    <div style="display: flex; align-items: center; gap: 8px; width: 100%; overflow: hidden;">
                        <span class="song-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left; flex: 0 1 auto;">${song.title}</span>
                        ${conditionBadge}
                    </div>
                    <span class="song-artist" style="text-align: left;">${song.artist}</span>
                </div>
                ${isAdmin ? `<button class="song-delete-btn" type="button" onclick="deleteSong('${song.id}')" title="삭제">✕</button>` : ''}
            </div>
        `;
    });

    const headerDiv = document.querySelector('.songbook-header');
    if (headerDiv) {
        const addBtn = headerDiv.querySelector('.add-song-btn');
        if (isAdmin && !addBtn) {
            const btn = document.createElement('button');
            btn.className = 'add-song-btn';
            btn.type = 'button';
            btn.textContent = '+';
            btn.onclick = () => {
                document.getElementById('adminSongForm').classList.add('visible');
                document.getElementById('newSongTitle').focus();
            };
            headerDiv.appendChild(btn);
        } else if (!isAdmin && addBtn) {
            addBtn.remove();
        }
    }

    const favBtn = document.getElementById('favFilterBtn');
    if (favBtn) {
        favBtn.classList.toggle('active', songbookCurrentFilter === 'Favorites');
    }

    const uniqueArtists = [...new Set(songbookSongs.map(s => s.artist))].sort((a, b) => a.localeCompare(b, 'ko', { sensitivity: 'base' }));
    
    artistListDiv.innerHTML = '';
    
    const allActive = songbookCurrentFilter === 'All' ? 'active' : '';
    artistListDiv.innerHTML += `<button class="artist-btn ${allActive}" onclick="setSongbookFilter('All')" type="button">All</button>`;
    
    uniqueArtists.forEach(a => {
        const active = songbookCurrentFilter === a ? 'active' : '';
        artistListDiv.innerHTML += `<button class="artist-btn ${active}" onclick="setSongbookFilter('${a}')" type="button">${a}</button>`;
    });        
}

function openBrowser(url, id, title) {
    if(!url) {
        showToast("등록된 링크가 없습니다.");
        return;
    }
    currentModalSongId = id;
    document.getElementById('browserTitle').innerText = title ? title : 'HTVVI 브라우저';
    document.getElementById('browserModal').classList.add('visible');
    
    let src = url;
    if (url.includes("sooplive.com/player/")) {
        const match = url.match(/player\/(\d+)/);
        const videoId = match ? match[1] : url.split('/').pop().split('?')[0];
        src = `https://vod.sooplive.com/player/${videoId}/embed?showChat=false&autoPlay=true&mutePlay=false`;
    } else if (extractYtId(url)) {
        const videoId = extractYtId(url);
        src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    
    document.getElementById('browserIframe').src = src;
    
    const btn = document.getElementById('modalFavoriteBtn');
    if(id) {
        btn.style.display = 'flex';
        updateModalFavoriteBtn();
    } else {
        btn.style.display = 'none';
    }
}

function updateModalFavoriteBtn() {
    if(!currentModalSongId) return;
    const btn = document.getElementById('modalFavoriteBtn');
    const favorites = getFavorites();
    
    const starSolidModal = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clip-rule="evenodd" /></svg>`;
    const starOutlineModal = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>`;

    if(favorites.includes(currentModalSongId)) {
        btn.classList.add('active');
        btn.innerHTML = `${starSolidModal} 즐겨찾기 해제`;
    } else {
        btn.classList.remove('active');
        btn.innerHTML = `${starOutlineModal} 즐겨찾기 추가`;
    }
}

function toggleModalFavorite() {
    if(!currentModalSongId) return;
    const fakeEvent = { stopPropagation: () => {} };
    toggleFavorite(fakeEvent, currentModalSongId);
    updateModalFavoriteBtn();
    updateFavPlayerPlaylist(); 
}

function closeBrowser() {
    document.getElementById('browserModal').classList.remove('visible');
    document.getElementById('browserIframe').src = '';
    currentModalSongId = null;
}

function editSong(event, id) {
    if (!isAdmin) return true;
    event.preventDefault();
    const song = songbookSongs.find(item => item.id === id);
    if (!song) return false;
    document.getElementById('newSongTitle').value = song.title;
    document.getElementById('newSongArtist').value = song.artist;
    document.getElementById('newSongUrl').value = song.url;
    document.getElementById('isConditionSong').checked = song.isConditionSong || false;
    document.getElementById('adminSongForm').classList.add('visible');
    songbookIsEditing = id;
    document.getElementById('addSongBtn').textContent = '수정 저장';
    return false;
}

function updateSongbookAdminUI() {
    document.getElementById('adminSongForm').classList.toggle('visible', isAdmin);
    document.getElementById('addSongBtn').textContent = '노래 추가';
    renderSongbook();
}

async function addSong() {
    const titleInput = document.getElementById('newSongTitle');
    const artistInput = document.getElementById('newSongArtist');
    const urlInput = document.getElementById('newSongUrl');
    const conditionCheckbox = document.getElementById('isConditionSong');
    
    const title = titleInput.value.trim();
    const artist = artistInput.value.trim();
    const url = urlInput.value.trim();
    const isConditionSong = conditionCheckbox.checked;
    
    if (!title || !artist) {
        showToast('노래 제목과 가수명을 입력해주세요.');
        return;
    }
    try {
        if (songbookIsEditing !== null) {
            await setDoc(doc(db, 'songbook_songs', songbookIsEditing), {
                title, artist, url, isConditionSong
            });
            songbookIsEditing = null;
        } else {
            await addDoc(collection(db, 'songbook_songs'), {
                title, artist, url, isConditionSong
            });
        }
        titleInput.value = '';
        artistInput.value = '';
        urlInput.value = '';
        conditionCheckbox.checked = false;
        document.getElementById('addSongBtn').textContent = '노래 추가';
        await loadSongbookSongs();
        renderSongbook();
        showToast('노래가 저장되었습니다.');
    } catch (error) {
        console.error('노래 저장 실패:', error);
        showToast('노래 저장에 실패했습니다.');
    }
}

function cancelEdit() {
    document.getElementById('newSongTitle').value = '';
    document.getElementById('newSongArtist').value = '';
    document.getElementById('newSongUrl').value = '';
    document.getElementById('isConditionSong').checked = false;
    songbookIsEditing = null;
    document.getElementById('addSongBtn').textContent = '노래 추가';
}

async function deleteSong(id) {
    if (!isAdmin) return;
    if (!confirm('이 노래를 삭제하시겠습니까?')) return;
    try {
        await deleteDoc(doc(db, 'songbook_songs', id));
        await loadSongbookSongs();
        renderSongbook();
        showToast('노래가 삭제되었습니다.');
    } catch (error) {
        console.error('노래 삭제 실패:', error);
        showToast('노래 삭제에 실패했습니다.');
    }
}

window.setSongbookFilter = function(filter) {
    const favBtn = document.getElementById('favFilterBtn');
    if (songbookCurrentFilter === filter && filter !== 'All') {
        songbookCurrentFilter = 'All';
        if (favBtn) favBtn.classList.remove('active');
    } else {
        songbookCurrentFilter = filter;
        if (favBtn) {
            if (filter === 'Favorites') {
                favBtn.classList.add('active');
            } else {
                favBtn.classList.remove('active');
            }
        }
    }
    renderSongbook();
}

window.showTab = async function(tab) {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    const calendarTop = document.querySelector('.calendar-top');
    const calendarBody = document.querySelector('.calendar-body');
    const songbookSection = document.getElementById('songbookSection');
    
    const todaySchedulePanel = document.getElementById('todaySchedulePanel');
    const favoritePlayerPanel = document.getElementById('favoritePlayerPanel');

    if (tab === 'songbook') {
        calendarTop.style.display = 'none';
        calendarBody.style.display = 'none';
        songbookSection.classList.add('visible');
        
        if(todaySchedulePanel) todaySchedulePanel.style.display = 'none';
        
        // 노래책 최초 1회만 데이터 로딩
        if (!isSongbookLoaded) {
            const loadingOverlay = document.getElementById('songbookLoading');
            if (loadingOverlay) loadingOverlay.classList.remove('hidden');

            await loadSongbookSongs();
            isSongbookLoaded = true;

            if (loadingOverlay) {
                setTimeout(() => {
                    loadingOverlay.classList.add('hidden');
                }, 500);
            }
        }

        renderSongbook();
        updateFavPlayerPlaylist();
        window.location.hash = '#songbook';
    } else {
        calendarTop.style.display = 'flex';
        calendarBody.style.display = 'flex';
        songbookSection.classList.remove('visible');
        
        if(todaySchedulePanel) todaySchedulePanel.style.display = 'block';
        
        await ensureMonthsLoadedForDate(currentDate);
        renderCalendar();
        
        window.location.hash = '#schedule';
    }
}

function handlePlayerPosition() {
    const playerPanel = document.getElementById('favoritePlayerPanel');
    const sidebar = document.querySelector('.songbook-sidebar');
    if (!playerPanel || !sidebar) return;

    if (window.innerWidth <= 768) {
        if (playerPanel.parentElement !== document.body) {
            document.body.appendChild(playerPanel);
        }
    } else {
        if (playerPanel.parentElement !== sidebar) {
            sidebar.insertBefore(playerPanel, sidebar.firstChild);
            playerPanel.classList.remove('show-sheet');
        }
    }
}

window.toggleMobileMenu = function() {
    const container = document.getElementById('mobileMenuContainer');
    const iconDefault = document.getElementById('menuIconDefault');
    const iconClose = document.getElementById('menuIconClose');
    if (!container) return;

    container.classList.toggle('open');
    if (iconDefault && iconClose) {
        iconDefault.style.display = container.classList.contains('open') ? 'none' : 'block';
        iconClose.style.display = container.classList.contains('open') ? 'block' : 'none';
    }
};

window.handleMobileTab = function(tab) {
    window.showTab(tab);
    window.toggleMobileMenu();
};

window.toggleMobilePlayer = function() {
    const playerPanel = document.getElementById('favoritePlayerPanel');
    if (playerPanel) {
        playerPanel.classList.toggle('show-sheet');
    }
    window.toggleMobileMenu();
};

Object.assign(window, {
    handleEventImgUpload, handleMemberImgUpload, addMember, deleteMember,
    openMemberManager, renderMemberList, showToast, closeModal, formatTime12h,
    setAMPM, openAddModal, openEditModal, saveEvent, deleteEvent, showInfo,
    toggleMemo, openMemoInput, closeMemoInput, saveMemoItem, selectMemoTab, openMonthPicker, changePickerYear,
    promptAdmin, loginAdmin,
    renderSongbook, openBrowser, closeBrowser,
    editSong, addSong, cancelEdit, deleteSong, setSongbookFilter,
    updateSongbookAdminUI, toggleFavorite, toggleModalFavorite,
    toggleMobileMenu, handleMobileTab, toggleMobilePlayer
});

window.onload = async () => {
    await loadData();
    handlePlayerPosition();
    
    const initialTab = window.location.hash === '#songbook' ? 'songbook' : 'schedule';
    await window.showTab(initialTab);

    document.getElementById('btnMin').innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
    
    let lastWidth = window.innerWidth;
    window.addEventListener('resize', () => {
        if (window.innerWidth !== lastWidth) {
            lastWidth = window.innerWidth;
            if (window.location.hash !== '#songbook') renderCalendar();
            handlePlayerPosition();
        }
    });

    setTimeout(() => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            setTimeout(() => {
                loadingOverlay.remove();
            }, 500);
        }
    }, 1000);
};