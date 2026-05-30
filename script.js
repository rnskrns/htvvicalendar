// =========================================================================
// 앱 아이콘(파비콘 및 애플 터치 아이콘) 동적 설정
// =========================================================================
function setAppIcon() {
    const iconUrl = "https://i.postimg.cc/wjrJrQ0c/A1EAA0.png";
    
    let linkIcon = document.querySelector("link[rel~='icon']");
    if (!linkIcon) {
        linkIcon = document.createElement('link');
        linkIcon.rel = 'icon';
        document.head.appendChild(linkIcon);
    }
    linkIcon.href = iconUrl;

    let appleIcon = document.querySelector("link[rel='apple-touch-icon']");
    if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        document.head.appendChild(appleIcon);
    }
    appleIcon.href = iconUrl;
}
setAppIcon();

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// =========================================================================
// 전역 함수 바인딩
// =========================================================================
window.toggleAmpm = toggleAmpm; window.handleAdminClick = handleAdminClick; window.checkPassword = checkPassword; window.logoutAdmin = logoutAdmin;
window.openPasswordModal = openPasswordModal; window.closePasswordModal = closePasswordModal; window.closeLogoutModal = closeLogoutModal;
window.handleDayClick = handleDayClick; window.handleDayRightClick = handleDayRightClick; window.editFromMenu = editFromMenu;
window.closeEditModal = closeEditModal; window.saveEditedSchedule = saveEditedSchedule; window.deleteScheduleAction = deleteScheduleAction; window.openDetailModal = openDetailModal; window.closeDetailModal = closeDetailModal;
window.openAllSchedulesModal = openAllSchedulesModal; window.changeTab = changeTab; window.changeMonth = changeMonth; window.openMonthPicker = openMonthPicker;
window.closeMonthPicker = closeMonthPicker; window.changePickerYear = changePickerYear; window.selectMonth = selectMonth; window.addScheduleInputBlock = addScheduleInputBlock;
window.closeScheduleModal = closeScheduleModal; window.saveSchedule = saveSchedule; window.toggleFields = toggleFields; 
window.toggleProfileDropdown = toggleProfileDropdown; window.openLinkModal = openLinkModal; window.closeLinkModal = closeLinkModal;
window.addMemberLink = addMemberLink; window.deleteMemberLink = deleteMemberLink; window.addUpLink = addUpLink; window.deleteUpLink = deleteUpLink;
window.toggleUpPanel = toggleUpPanel; window.toggleMemoPanel = toggleMemoPanel; window.closeSidePanel = closeSidePanel;
window.openMobileTabMenu = openMobileTabMenu; window.closeMobileTabMenu = closeMobileTabMenu;
window.executeDesktopTabChange = executeDesktopTabChange; window.executeMobileTabChange = executeMobileTabChange;
window.changeHomeDate = changeHomeDate; window.changeIndividualWeek = changeIndividualWeek;
window.openMobileDatePicker = openMobileDatePicker; window.closeMobileDatePicker = closeMobileDatePicker;
window.changeDatePickerMonth = changeDatePickerMonth; window.selectMobileDate = selectMobileDate;
window.closeUpPopup = closeUpPopup; 
window.moveLink = moveLink; window.editMemberLink = editMemberLink;
window.openMemoAddModal = openMemoAddModal; window.openMemoEditModal = openMemoEditModal; 
window.closeMemoModal = closeMemoModal; window.saveMemoAction = saveMemoAction; window.deleteMemo = deleteMemo;
window.openSmartLink = openSmartLink; // 스마트 링크 함수 바인딩

// =========================================================================
// Firebase 초기화 및 변수 선언
// =========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBKHLfymzRWRqUEsX9MF_SlZoph1WM_4Ck",
    authDomain: "signalplanner-95f78.firebaseapp.com",
    projectId: "signalplanner-95f78",
    storageBucket: "signalplanner-95f78.firebasestorage.app",
    messagingSenderId: "859229037333",
    appId: "1:859229037333:web:30eb50897b017c33b13f1c",
    measurementId: "G-D1RQRFH1KF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let scheduleList = []; 
let memoList = { '달타':[], '서피카':[], '다룽':[], '최또':[], '카나시':[] };
let isAdmin = false;
let loggedInUser = null; 
let currentPage = '홈';
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let pickerYear = currentYear;
let contextTargetId = null;
let currentEditingIds = [];
let targetModalContext = { year: currentYear, month: currentMonth, day: 1, member: '홈' };
let currentEditingMemoId = null;

let isMobile = window.innerWidth <= 1024;
let sidePanelMode = null; 
let homeTargetDate = new Date(); 
let individualTargetDate = new Date(); 
let datePickerCurrentDate = new Date();

window.addEventListener('resize', () => {
    const wasMobile = isMobile;
    isMobile = window.innerWidth <= 1024;
    if (wasMobile !== isMobile) {
        sidePanelMode = null; 
        closeSidePanel(true);
        renderHeaderTabs();
        render();
    }
});

const themeColors = { '홈': '#FF5252', '달타': '#FBC02D', '서피카': '#F06292', '다룽': '#1E88E5', '최또': '#D81B60', '카나시': '#F57C00' };

const collectionMap = { '달타': 'daltaevent', '서피카': 'SEOPICAevent', '다룽': 'drungevent', '최또': 'choiagainevent', '카나시': 'kanashievent' };
const memoCollectionMap = { '달타': 'daltamemo', '서피카': 'seopicamemo', '다룽': 'drungmemo', '최또': 'choiagainmemo', '카나시': 'kanashimemo' };

const members = [
    { name: '달타', img: 'https://i.postimg.cc/y8VYYyZM/dalta-peusa.png', link: '' },
    { name: '서피카', img: 'https://i.postimg.cc/7YrWFxGX/jemog-eul-iblyeoghaejuseyo-(1).png', link: '' },
    { name: '다룽', img: 'https://i.postimg.cc/bNfB7zDm/jemog-eul-iblyeoghaejuseyo-(2).png', link: '' },
    { name: '최또', img: 'https://i.postimg.cc/fTQrGwtB/jemog-eul-iblyeoghaejuseyo.png', link: '' },
    { name: '카나시', img: 'https://i.postimg.cc/vZQHHtVC/kanasi-peusa.png', link: '' }
];

const memberCardImages = {
    '달타': { bangon: 'https://i.postimg.cc/P5N94Lsc/jemog-eul-iblyeoghaejuseyo.png', hubang: 'https://i.postimg.cc/br7DBDVt/jemog-eul-iblyeoghaejuseyo-(5).png' },
    '서피카': { bangon: 'https://i.postimg.cc/0yrFf6RF/jemog-eul-iblyeoghaejuseyo-(2).png', hubang: 'https://i.postimg.cc/T1zL4LNQ/jemog-eul-iblyeoghaejuseyo-(9).png' },
    '다룽': { bangon: 'https://i.postimg.cc/zG36jLZc/jemog-eul-iblyeoghaejuseyo-(3).png', hubang: 'https://i.postimg.cc/MHCMFM3M/jemog-eul-iblyeoghaejuseyo-(8).png' },
    '최또': { bangon: 'https://i.postimg.cc/FH18Zf56/jemog-eul-iblyeoghaejuseyo-(1).png', hubang: 'https://i.postimg.cc/SRB2v21z/jemog-eul-iblyeoghaejuseyo-(6).png' },
    '카나시': { bangon: 'https://i.postimg.cc/8z33n1Nt/jemog-eul-iblyeoghaejuseyo-(4).png', hubang: 'https://i.postimg.cc/vTJgNg29/jemog-eul-iblyeoghaejuseyo-(7).png' }
};

const defaultMemberLinks = {
    '달타': [ { title: '공지', url: 'https://cafe.naver.com/f-e/cafes/30973382/menus/20?viewType=L' }, { title: 'SOOP', url: 'https://www.sooplive.com/station/dalta20' }, { title: '유튜브', url: 'https://www.youtube.com/@Dalta20' } ],
    '서피카': [ { title: '공지', url: 'https://cafe.naver.com/f-e/cafes/30973382/menus/85' }, { title: 'SOOP', url: 'https://www.sooplive.com/station/spica21' }, { title: '유튜브', url: 'https://www.youtube.com/@SEOPICA' } ],
    '다룽': [ { title: '공지', url: 'https://cafe.naver.com/f-e/cafes/30973382/menus/46' }, { title: 'SOOP', url: 'https://www.sooplive.com/station/daarung22' }, { title: '유튜브', url: 'https://www.youtube.com/@daarung22' } ],
    '최또': [ { title: '공지', url: 'https://cafe.naver.com/f-e/cafes/30973382/menus/88' }, { title: 'SOOP', url: 'https://www.sooplive.com/station/choiagain' }, { title: '유튜브', url: 'https://www.youtube.com/@CHOI_AGAIN' } ],
    '카나시': [ { title: '공지', url: 'https://cafe.naver.com/f-e/cafes/30973382/menus/105' }, { title: 'SOOP', url: 'https://www.sooplive.com/station/kjhh0029' }, { title: '유튜브', url: 'https://www.youtube.com/@kanashi_0123' } ]
};

let dynamicLinks = JSON.parse(JSON.stringify(defaultMemberLinks));
let upLinksList = [];

const adminAccounts = { 
    'dalta20@naver.com': { name: '달타', img: 'https://stimg.sooplive.com/LOGO/da/dalta20/dalta20.jpg' },
    'real_email2@naver.com': { name: '서피카', img: 'https://stimg.sooplive.com/LOGO/sp/spica21/spica21.jpg' },
    'daarung22@naver.com': { name: '다룽', img: 'https://stimg.sooplive.com/LOGO/da/daarung22/daarung22.jpg' },
    'choiagain333@naver.com': { name: '최또', img: 'https://stimg.sooplive.com/LOGO/ch/choiagain/choiagain.jpg' },
    'jhh0029@naver.com': { name: '카나시', img: 'https://stimg.sooplive.com/LOGO/kj/kjhh0029/kjhh0029.jpg' },
    'rnskrns@naver.com': { name: '관리자', img: 'https://i.postimg.cc/cHc39MV6/11.jpg' },
    'jkolpc@naver.com': { name: '관리자', img: 'https://i.postimg.cc/cHc39MV6/11.jpg' }
};

const adminPasswords = {
    '0820': { name: '달타', img: 'https://stimg.sooplive.com/LOGO/da/dalta20/dalta20.jpg' },
    '0221': { name: '서피카', img: 'https://stimg.sooplive.com/LOGO/sp/spica21/spica21.jpg' },
    '1128': { name: '다룽', img: 'https://stimg.sooplive.com/LOGO/da/daarung22/daarung22.jpg' },
    '1030': { name: '최또', img: 'https://stimg.sooplive.com/LOGO/ch/choiagain/choiagain.jpg' },
    '0123': { name: '카나시', img: 'https://stimg.sooplive.com/LOGO/kj/kjhh0029/kjhh0029.jpg' }
};

// =========================================================================
// 스마트 링크 처리 함수 (앱 딥링크 완벽 지원)
// =========================================================================
function openSmartLink(url) {
    if (!url) return;
    
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    if (isMobileDevice) {
        // 모바일 환경: window.open 대신 현재 창 이동(location.href)을 사용해야 
        // OS단에서 딥링크(SOOP, 유튜브, 네이버 카페 등 앱 실행)를 정상적으로 가로챕니다.
        // ※ 중요: 이전처럼 www를 m으로 강제 변환하면 SOOP 내부 라우팅이 깨져서 에러가 발생하므로 원본 주소 그대로 넘깁니다!
        window.location.href = url;
    } else {
        // PC 환경: 정상적으로 새 탭으로 열기
        window.open(url, '_blank');
    }
}

function initNaverLogin() {
    try {
        if (typeof naver !== 'undefined') {
            const naverLogin = new naver.LoginWithNaverId({
                clientId: "an6qp9jysDqzS6UnwJZy", 
                callbackUrl: "https://signalcalendar.vercel.app/", 
                isPopup: false, 
                loginButton: { color: "green", type: 3, height: 48 }
            });
            naverLogin.init();
            
            naverLogin.getLoginStatus(function (status) {
                if (status) {
                    const userEmail = naverLogin.user.getEmail();
                    if (adminAccounts[userEmail]) {
                        isAdmin = true;
                        loggedInUser = adminAccounts[userEmail];
                        sessionStorage.setItem('isAdmin', 'true');
                        sessionStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
                        updateLoginUI(loggedInUser);
                        closePasswordModal();
                    } else {
                        alert("관리자 권한이 없는 계정입니다.");
                        naverLogin.logout();
                    }
                }
            });
        }
    } catch(e) { console.error("Naver Login Init Error:", e); }
}

async function loadLinksFromFirebase() {
    try {
        const now = new Date();
        const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
        const todayYYYYMMDD = kstTime.toISOString().split('T')[0];

        const upSnap = await getDocs(collection(db, 'uplinks'));
        upLinksList = [];
        
        for (const d of upSnap.docs) {
            const data = d.data();
            if (data.deadline && data.deadline < todayYYYYMMDD) {
                await deleteDoc(doc(db, 'uplinks', d.id));
            } else {
                upLinksList.push({ id: d.id, ...data });
            }
        }

        const linkSnap = await getDocs(collection(db, 'memberLinks'));
        if (linkSnap.empty) {
            for (const member of Object.keys(defaultMemberLinks)) {
                for (const link of defaultMemberLinks[member]) {
                    await addDoc(collection(db, 'memberLinks'), { member, title: link.title, url: link.url, timestamp: Date.now() });
                }
            }
            const reSnap = await getDocs(collection(db, 'memberLinks'));
            let dbLinks = { '달타':[], '서피카':[], '다룽':[], '최또':[], '카나시':[] };
            reSnap.forEach(doc => { const data = doc.data(); if(dbLinks[data.member]) dbLinks[data.member].push({ id: doc.id, ...data }); });
            dynamicLinks = dbLinks;
        } else {
            let dbLinks = { '달타':[], '서피카':[], '다룽':[], '최또':[], '카나시':[] };
            linkSnap.forEach(doc => {
                const data = doc.data();
                if(dbLinks[data.member]) dbLinks[data.member].push({ id: doc.id, ...data });
            });
            for(let m in dbLinks) dbLinks[m].sort((a,b) => (a.timestamp||0) - (b.timestamp||0));
            dynamicLinks = dbLinks;
        }
        renderHeaderTabs();
        checkAndShowPopup(todayYYYYMMDD);
    } catch(e) { console.error("링크 로드 실패:", e); }
}

function checkAndShowPopup(today) {
    const lastClosed = localStorage.getItem('upPopupClosedDate');
    if (lastClosed !== today && upLinksList.length > 0) {
        showUpPopup();
    }
}

function showUpPopup() {
    const list = document.getElementById('upPopupList');
    if(!list) return;
    list.innerHTML = upLinksList.map(up => {
        const theme = themeColors[up.member] || '#5D4037';
        return `
        <div class="border-[2px] rounded-xl p-4 mb-3 cursor-pointer hover:bg-gray-50 flex flex-col gap-1" style="border-color:${theme}" onclick="openSmartLink('${up.url}')">
            <div class="font-bold text-[17px] mb-2 text-gray-800 break-words leading-snug">${up.title}</div>
            <div class="flex justify-between items-end">
                <span class="text-[12px] font-bold text-white px-2.5 py-1 rounded-md" style="background-color: ${theme}">${up.member}</span>
                <span class="text-[12px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">${up.deadline ? '마감: ' + up.deadline : '마감일 없음'}</span>
            </div>
        </div>
        `;
    }).join('');
    document.getElementById('upPopupOverlay').classList.remove('hidden');
}

function closeUpPopup() {
    if (document.getElementById('noMorePopup').checked) {
        const now = new Date();
        const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
        localStorage.setItem('upPopupClosedDate', kstTime.toISOString().split('T')[0]);
    }
    document.getElementById('upPopupOverlay').classList.add('hidden');
}

function renderHeaderTabs() {
    const desktopContainer = document.getElementById('headerNavTabs');
    const mobileNav = document.getElementById('mobileBottomNav');
    const tabs = ['달타', '서피카', '다룽', '최또', '카나시'];
    const colors = { '달타': '#FBC02D', '서피카': '#F06292', '다룽': '#1E88E5', '최또': '#D81B60', '카나시': '#F57C00' };

    if (desktopContainer) {
        let html = `
            <button class="font-paperozi px-5 py-2.5 bg-transparent border-2 border-transparent text-[#5D4037] font-bold rounded-lg hover:border-[#FF5252] hover:text-[#FF5252] transition-all duration-200 flex items-center justify-center" onclick="executeDesktopTabChange('홈')">
                <i class="fi fi-rr-home text-2xl"></i>
            </button>
        `;
        
        tabs.forEach(tab => {
            const hoverColor = colors[tab];
            const links = dynamicLinks[tab] || [];
            let dropdownHtml = links.map(link => `
                <a href="#" onclick="openSmartLink('${link.url}'); event.preventDefault();" class="block px-4 py-2 text-[14.5px] font-bold text-gray-700 hover:bg-gray-100 hover:text-[${hoverColor}] transition-colors text-center border-b border-gray-100">${link.title}</a>
            `).join('');
            
            html += `
                <div class="relative group">
                    <button class="font-paperozi px-5 py-2.5 text-lg bg-transparent border-2 border-transparent text-[#5D4037] font-bold rounded-lg hover:border-[${hoverColor}] hover:text-[${hoverColor}] transition-all duration-200" onclick="executeDesktopTabChange('${tab}')">${tab}</button>
                    <div class="absolute left-1/2 -translate-x-1/2 top-full pt-1 w-32 hidden group-hover:block z-[2000]">
                        <div class="bg-white flex flex-col shadow-xl rounded-xl border-2 border-[#5D4037] overflow-hidden py-1">
                            <a href="#" onclick="executeDesktopTabChange('${tab}'); event.preventDefault();" class="block px-4 py-2 text-[14.5px] font-bold text-gray-700 hover:bg-gray-100 hover:text-[${hoverColor}] transition-colors border-b border-gray-100 text-center">일정표</a>
                            ${dropdownHtml}
                        </div>
                    </div>
                </div>
            `;
        });
        desktopContainer.innerHTML = html;
    }

    if (mobileNav) {
        let mHtml = '';
        ['홈', ...tabs].forEach(tab => {
            const isActive = currentPage === tab;
            const activeColor = tab === '홈' ? '#FF5252' : colors[tab];
            let contentHtml = '';
            
            if (tab === '홈') {
                contentHtml = `<i class="fi fi-rr-home text-[24px] transition-all ${isActive ? 'scale-110' : ''}" style="color: ${isActive ? activeColor : '#9CA3AF'}"></i>`;
            } else {
                contentHtml = `<span class="text-[16px] font-bold font-paperozi transition-all ${isActive ? 'scale-110' : ''}" style="color: ${isActive ? activeColor : '#9CA3AF'}">${tab}</span>`;
            }
            
            mHtml += `
                <button class="flex flex-col items-center justify-center w-full h-full gap-1 transition-all" onclick="openMobileTabMenu('${tab}')">
                    ${contentHtml}
                </button>
            `;
        });
        mobileNav.innerHTML = mHtml;
    }
}

function openMobileTabMenu(tab) {
    if (tab === '홈') { executeDesktopTabChange('홈'); return; }
    const overlay = document.getElementById('mobileTabMenuOverlay');
    const container = document.getElementById('mobileTabMenuContainer');
    const color = themeColors[tab];

    let html = `
        <div class="flex flex-col gap-2 relative">
            <div class="text-center font-bold text-[18px] mb-2 font-paperozi" style="color: ${color}">${tab} 메뉴</div>
            <button onclick="executeMobileTabChange('${tab}')" class="w-full py-2.5 bg-white rounded-lg font-bold text-[14px] border-[1.5px] border-gray-200 shadow-sm active:bg-gray-50 text-gray-800">일정표 보기</button>
    `;
    
    const links = dynamicLinks[tab] || [];
    links.forEach(l => {
        html += `<a href="#" onclick="openSmartLink('${l.url}'); event.preventDefault();" class="w-full py-2.5 text-center bg-white rounded-lg font-bold text-[14px] shadow-sm border-[1.5px] active:brightness-95" style="border-color: ${color}; color: ${color}">${l.title}</a>`;
    });
    html += `</div>`;
    container.innerHTML = html;
    
    overlay.classList.remove('hidden'); overlay.classList.add('block');
    requestAnimationFrame(() => {
        container.classList.remove('opacity-0', 'translate-y-4');
        container.classList.add('opacity-100', 'translate-y-0');
    });
}

function closeMobileTabMenu() {
    const overlay = document.getElementById('mobileTabMenuOverlay');
    const container = document.getElementById('mobileTabMenuContainer');
    if(!container) return;
    container.classList.remove('opacity-100', 'translate-y-0');
    container.classList.add('opacity-0', 'translate-y-4');
    setTimeout(() => { overlay.classList.add('hidden'); overlay.classList.remove('block'); }, 200);
}

function executeDesktopTabChange(tab) { changeTab(tab); }
function executeMobileTabChange(tab) { closeMobileTabMenu(); changeTab(tab); }

function updateLoginUI(user) {
    const desktopContainer = document.getElementById('desktopAuthContainer');
    if(desktopContainer) {
        desktopContainer.innerHTML = `
            <div class="relative inline-block text-left group z-[2000]">
                <div class="flex items-center gap-2 cursor-pointer bg-white border-2 border-gray-200 shadow-sm px-4 py-1.5 rounded-xl font-bold" onclick="toggleProfileDropdown('desktopProfileMenu')">
                    <img src="${user.img || 'https://via.placeholder.com/40'}" class="w-8 h-8 rounded-full object-cover border-2 border-[#5D4037]">
                    <span class="text-lg text-[#5D4037] font-paperozi">${user.name}</span>
                    <i class="fi fi-rr-caret-down text-[#5D4037]"></i>
                </div>
                <div id="desktopProfileMenu" class="hidden absolute right-0 top-full mt-2 w-36 bg-white flex-col shadow-xl rounded-xl border-2 border-[#5D4037] overflow-hidden">
                    <button onclick="openLinkModal()" class="px-4 py-3 text-left font-bold text-[#5D4037] font-paperozi hover:bg-gray-100 border-b border-gray-100">링크관리</button>
                    <button onclick="logoutAdmin()" class="px-4 py-3 text-left font-bold text-red-500 font-paperozi hover:bg-gray-100">로그아웃</button>
                </div>
            </div>
        `;
    }
    const mobileContainer = document.getElementById('mobileAuthContainer');
    if(mobileContainer) {
        mobileContainer.innerHTML = `
            <div class="relative inline-block text-left z-[2000]">
                <div class="flex items-center gap-1 cursor-pointer bg-white border border-gray-200 shadow-sm px-2 py-[5px] rounded-lg font-bold" onclick="toggleProfileDropdown('mobileProfileMenu')">
                    <img src="${user.img || 'https://via.placeholder.com/40'}" class="w-[20px] h-[20px] rounded-full object-cover border border-[#5D4037]">
                </div>
                <div id="mobileProfileMenu" class="hidden absolute right-0 top-full mt-2 w-28 bg-white flex-col shadow-xl rounded-xl border-2 border-[#5D4037] overflow-hidden">
                    <button onclick="openLinkModal()" class="px-3 py-2 text-left font-bold text-[#5D4037] text-sm font-paperozi hover:bg-gray-100 border-b border-gray-100">링크관리</button>
                    <button onclick="logoutAdmin()" class="px-3 py-2 text-left font-bold text-red-500 text-sm font-paperozi hover:bg-gray-100">로그아웃</button>
                </div>
            </div>
        `;
    }
}

function toggleProfileDropdown(menuId) {
    const menu = document.getElementById(menuId);
    if(menu) {
        if(menu.classList.contains('hidden')) { menu.classList.remove('hidden'); menu.classList.add('flex'); } 
        else { menu.classList.remove('flex'); menu.classList.add('hidden'); }
    }
}

window.addEventListener('click', (e) => {
    ['desktopProfileMenu', 'mobileProfileMenu'].forEach(id => {
        const pMenu = document.getElementById(id);
        if(pMenu && !pMenu.classList.contains('hidden') && !e.target.closest('#desktopAuthContainer') && !e.target.closest('#mobileAuthContainer')) {
            pMenu.classList.add('hidden'); pMenu.classList.remove('flex');
        }
    });
});

async function openLinkModal() {
    if(!isAdmin || !loggedInUser) return;
    const member = loggedInUser.name; 
    if(member === '관리자') { alert("개별 멤버 계정으로 로그인해주세요."); return; }

    const container = document.getElementById('memberLinksContainer');
    container.innerHTML = '';
    const links = dynamicLinks[member] || [];
    
    links.forEach((link, index) => {
        const isFirst = index === 0;
        const isLast = index === links.length - 1;
        container.innerHTML += `
            <div class="flex justify-between items-center bg-white border-2 border-gray-200 p-3 rounded-lg shadow-sm">
                <div class="font-bold text-[15px] text-[#5D4037] w-1/4 truncate">${link.title}</div>
                <div class="flex items-center gap-1 w-3/4 justify-end">
                    <a href="#" onclick="openSmartLink('${link.url}'); event.preventDefault();" class="text-[13px] text-blue-500 underline truncate max-w-[130px] mr-2">${link.url}</a>
                    <button onclick="moveLink('${member}', '${link.id}', -1)" class="p-1 text-gray-500 hover:text-[#5D4037] ${isFirst ? 'opacity-30 cursor-not-allowed' : ''}"><i class="fi fi-rr-angle-up text-lg"></i></button>
                    <button onclick="moveLink('${member}', '${link.id}', 1)" class="p-1 text-gray-500 hover:text-[#5D4037] ${isLast ? 'opacity-30 cursor-not-allowed' : ''}"><i class="fi fi-rr-angle-down text-lg"></i></button>
                    <button onclick="editMemberLink('${member}', '${link.id}')" class="text-[#5D4037] font-bold text-[13px] border-2 border-[#5D4037] px-2 py-0.5 rounded ml-1 hover:bg-[#5D4037] hover:text-white transition shrink-0">수정</button>
                    <button onclick="deleteMemberLink('${member}', '${link.id}')" class="text-white bg-red-500 w-6 h-6 rounded flex items-center justify-center hover:bg-red-600 transition shrink-0 ml-1"><i class="fi fi-br-cross-small"></i></button>
                </div>
            </div>
        `;
    });
    
    document.getElementById('linkModal').classList.replace('hidden', 'flex');
    ['desktopProfileMenu', 'mobileProfileMenu'].forEach(id => {
        const pMenu = document.getElementById(id);
        if(pMenu) { pMenu.classList.remove('flex'); pMenu.classList.add('hidden'); }
    });
}
function closeLinkModal() { document.getElementById('linkModal').classList.replace('flex', 'hidden'); }

async function moveLink(member, linkId, direction) {
    const arr = dynamicLinks[member];
    const idx = arr.findIndex(l => l.id === linkId);
    if (idx < 0 || idx + direction < 0 || idx + direction >= arr.length) return;

    const tempTime = arr[idx].timestamp;
    arr[idx].timestamp = arr[idx + direction].timestamp;
    arr[idx + direction].timestamp = tempTime;

    try {
        await updateDoc(doc(db, 'memberLinks', arr[idx].id), { timestamp: arr[idx].timestamp });
        await updateDoc(doc(db, 'memberLinks', arr[idx + direction].id), { timestamp: arr[idx + direction].timestamp });
        arr.sort((a,b) => a.timestamp - b.timestamp);
        openLinkModal(); renderHeaderTabs();
    } catch(e) { console.error(e); }
}

async function editMemberLink(member, linkId) {
    const link = dynamicLinks[member].find(l => l.id === linkId);
    if(!link) return;
    const newTitle = prompt("수정할 메뉴 이름을 입력하세요.", link.title);
    if(newTitle === null) return;
    const newUrl = prompt("수정할 메뉴의 URL을 입력하세요.", link.url);
    if(newUrl === null) return;

    if(newTitle.trim() !== '' && newUrl.trim() !== '') {
        try {
            await updateDoc(doc(db, 'memberLinks', linkId), { title: newTitle.trim(), url: newUrl.trim() });
            link.title = newTitle.trim();
            link.url = newUrl.trim();
            openLinkModal(); renderHeaderTabs();
        } catch(e) { console.error(e); }
    }
}

async function addMemberLink() {
    const title = document.getElementById('newLinkTitle').value.trim();
    const url = document.getElementById('newLinkUrl').value.trim();
    if(!title || !url) return alert('제목과 링크를 입력하세요.');
    const member = loggedInUser.name;
    const newLink = { member, title, url, timestamp: Date.now() };
    try {
        const docRef = await addDoc(collection(db, 'memberLinks'), newLink);
        newLink.id = docRef.id;
        if(!dynamicLinks[member]) dynamicLinks[member] = [];
        dynamicLinks[member].push(newLink);
        document.getElementById('newLinkTitle').value = ''; document.getElementById('newLinkUrl').value = '';
        openLinkModal(); renderHeaderTabs();
    } catch(e) { console.error(e); alert('추가 실패'); }
}

async function deleteMemberLink(member, linkId) {
    if(!confirm('삭제하시겠습니까?')) return;
    try {
        await deleteDoc(doc(db, 'memberLinks', linkId));
        dynamicLinks[member] = dynamicLinks[member].filter(l => l.id !== linkId);
        openLinkModal(); renderHeaderTabs();
    } catch(e) { console.error(e); }
}

async function addUpLink() {
    const title = document.getElementById('upTitle').value.trim();
    const url = document.getElementById('upUrl').value.trim();
    const deadline = document.getElementById('upDeadline').value;
    if(!title || !url) return alert('제목과 링크를 입력하세요.');
    const member = loggedInUser.name;
    const newUp = { member, title, url, deadline, timestamp: Date.now() };
    try {
        const docRef = await addDoc(collection(db, 'uplinks'), newUp);
        upLinksList.push({ id: docRef.id, ...newUp });
        alert('업링크가 추가되었습니다.');
        document.getElementById('upTitle').value = ''; document.getElementById('upUrl').value = ''; document.getElementById('upDeadline').value = '';
        if(sidePanelMode === 'UP') renderUpLinksPanel(); 
    } catch(e) { console.error(e); }
}

async function deleteUpLink(upId) {
    if(!confirm('이 업링크를 삭제하시겠습니까?')) return;
    try {
        await deleteDoc(doc(db, 'uplinks', upId));
        upLinksList = upLinksList.filter(u => u.id !== upId);
        if(sidePanelMode === 'UP') renderUpLinksPanel();
    } catch(e) { console.error(e); }
}

function toggleUpPanel() {
    if (sidePanelMode === 'UP') closeSidePanel();
    else openSidePanel('UP');
}
function toggleMemoPanel() {
    if (sidePanelMode === 'MEMO') closeSidePanel();
    else openSidePanel('MEMO');
}

function closeSidePanel(instant = false) {
    sidePanelMode = null;
    const panel = document.getElementById('sideExpansionPanel');
    const mobileOverlay = document.getElementById('mobilePanelOverlay');
    
    if(isMobile) {
        panel.classList.remove('translate-y-0', 'opacity-100');
        panel.classList.add('translate-y-full', 'opacity-0');
        if(mobileOverlay) { mobileOverlay.classList.remove('block'); mobileOverlay.classList.add('hidden'); }
    } else {
        panel.classList.remove('h-[890px]', 'opacity-100');
        panel.classList.add('h-0', 'opacity-0');
    }
    
    if (instant) {
        panel.classList.add('hidden'); panel.classList.remove('flex');
    } else {
        setTimeout(() => {
            if (sidePanelMode === null) { panel.classList.add('hidden'); panel.classList.remove('flex'); }
        }, 300);
    }
}

function openSidePanel(mode) {
    sidePanelMode = mode;
    const panel = document.getElementById('sideExpansionPanel');
    const mobileOverlay = document.getElementById('mobilePanelOverlay');
    
    panel.classList.remove('hidden'); panel.classList.add('flex');
    if(isMobile && mobileOverlay) { mobileOverlay.classList.remove('hidden'); mobileOverlay.classList.add('block'); }
    
    if (mode === 'MEMO') {
        const memos = memoList[currentPage] || [];
        const contentHtml = memos.map(memo => `
            <div class="bg-white p-4 rounded-xl border-[2.5px] border-[#5D4037] relative shadow-sm mb-4 cursor-pointer hover:bg-gray-50 transition" 
                 oncontextmenu="if(typeof isAdmin !== 'undefined' && isAdmin) { event.preventDefault(); event.stopPropagation(); window.openMemoEditModal('${memo.id}'); }">
                ${isAdmin ? `<button onclick="deleteMemo('${memo.id}')" class="absolute top-2 right-2 text-[#5D4037] hover:text-red-500 font-bold p-1 z-10"><i class="fi fi-br-cross-small"></i></button>` : ''}
                <div class="text-[13px] font-bold text-gray-500 mb-2 pointer-events-none">${memo.date || ''}</div>
                <div class="text-[16px] font-medium text-[#5D4037] whitespace-pre-wrap leading-relaxed pointer-events-none">${memo.content}</div>
            </div>
        `).join('');

        panel.innerHTML = `
            <div class="p-6 border-b-[4px] border-[#5D4037] bg-white flex justify-between items-center shadow-sm z-10 shrink-0">
                <div class="text-[22px] font-bold text-[#5D4037] font-paperozi flex items-center gap-2">
                    <i class="fi fi-rr-edit"></i> ${currentPage} 메모장
                </div>
                <div class="flex items-center gap-3">
                    ${isAdmin ? `<button onclick="openMemoAddModal()" class="w-9 h-9 flex items-center justify-center bg-[#5D4037] text-white rounded-full font-bold hover:brightness-110 shadow-sm transition"><i class="fi fi-br-plus"></i></button>` : ''}
                    <button onclick="closeSidePanel()" class="text-3xl text-[#5D4037] hover:text-red-500 cursor-pointer"><i class="fi fi-rr-cross-small"></i></button>
                </div>
            </div>
            <div class="flex-1 p-5 bg-[#FFFDF5] overflow-y-auto modal-scroll w-full">
                ${contentHtml || '<div class="text-center text-gray-400 font-bold mt-16 text-lg">저장된 메모가 없습니다.</div>'}
            </div>
        `;
    } else if (mode === 'UP') {
        renderUpLinksPanel();
    }

    requestAnimationFrame(() => {
        if(isMobile) {
            panel.classList.remove('translate-y-full', 'opacity-0'); panel.classList.add('translate-y-0', 'opacity-100');
        } else {
            panel.classList.remove('h-0', 'opacity-0'); panel.classList.add('h-[890px]', 'opacity-100');
        }
    });
}

function openMemoAddModal() {
    currentEditingMemoId = null;
    document.getElementById('memoModalTitle').innerText = '메모 추가';
    
    const now = new Date();
    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    document.getElementById('memoDate').value = kstTime.toISOString().split('T')[0];
    
    document.getElementById('memoContent').value = '';
    document.getElementById('memoModal').classList.replace('hidden', 'flex');
}

function openMemoEditModal(memoId) {
    if (!isAdmin) return;
    const memo = memoList[currentPage].find(m => m.id === memoId);
    if (!memo) return;
    currentEditingMemoId = memoId;
    document.getElementById('memoModalTitle').innerText = '메모 수정';
    document.getElementById('memoDate').value = memo.date || '';
    document.getElementById('memoContent').value = memo.content || '';
    document.getElementById('memoModal').classList.replace('hidden', 'flex');
}

function closeMemoModal() {
    document.getElementById('memoModal').classList.replace('flex', 'hidden');
}

async function saveMemoAction() {
    const date = document.getElementById('memoDate').value;
    const content = document.getElementById('memoContent').value.trim();
    if(!content) return alert('내용을 입력하세요.');

    const colName = memoCollectionMap[currentPage];
    if (!colName) return;

    try {
        if (currentEditingMemoId) {
            await updateDoc(doc(db, colName, currentEditingMemoId), { date, content });
            const m = memoList[currentPage].find(x => x.id === currentEditingMemoId);
            if(m) { m.date = date; m.content = content; }
        } else {
            const docRef = await addDoc(collection(db, colName), { date, content, timestamp: Date.now() });
            if(!memoList[currentPage]) memoList[currentPage] = [];
            memoList[currentPage].unshift({ id: docRef.id, collectionName: colName, date, content, timestamp: Date.now() });
        }
        closeMemoModal();
        if (sidePanelMode === 'MEMO') openSidePanel('MEMO');
    } catch(e) { console.error('메모 저장 실패:', e); }
}

async function deleteMemo(memoId) {
    if(!confirm('해당 메모를 삭제하시겠습니까?')) return;
    const colName = memoCollectionMap[currentPage];
    try {
        await deleteDoc(doc(db, colName, memoId));
        memoList[currentPage] = memoList[currentPage].filter(m => m.id !== memoId);
        if (sidePanelMode === 'MEMO') openSidePanel('MEMO');
    } catch(e) { console.error('메모 삭제 실패:', e); }
}

function renderUpLinksPanel() {
    const panel = document.getElementById('sideExpansionPanel');
    const sorted = [...upLinksList].sort((a, b) => {
        if (a.deadline && b.deadline) {
            if (a.deadline === b.deadline) return (a.timestamp || 0) - (b.timestamp || 0);
            return a.deadline < b.deadline ? -1 : 1; 
        }
        if (a.deadline && !b.deadline) return -1; 
        if (!a.deadline && b.deadline) return 1;
        return (a.timestamp || 0) - (b.timestamp || 0); 
    });
    
    let upCardsHtml = sorted.map(up => {
        const theme = themeColors[up.member] || '#5D4037';
        const deleteBtn = (isAdmin && loggedInUser.name === up.member) ? 
            `<button onclick="event.stopPropagation(); deleteUpLink('${up.id}')" class="text-red-500 hover:text-red-700 ml-2 font-bold z-20 absolute top-2 right-2"><i class="fi fi-br-cross-small"></i></button>` : '';
            
        return `
            <div class="relative w-full border-[3px] rounded-xl p-5 mb-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-[2px] cursor-pointer bg-white shrink-0" 
                 style="border-color: ${theme}; border-left-width: 8px;"
                 onclick="openSmartLink('${up.url}')">
                ${deleteBtn}
                <div class="text-[17px] font-bold font-paperozi mb-4 text-gray-800 break-words pr-6 leading-snug">${up.title}</div>
                <div class="flex justify-between items-end">
                    <span class="text-[12px] font-bold text-white px-2.5 py-1 rounded-md" style="background-color: ${theme}">${up.member}</span>
                    ${up.deadline ? `<span class="text-[13px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">마감: ${up.deadline}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');

    if(upLinksList.length === 0) { upCardsHtml = `<div class="text-center text-gray-400 font-bold mt-16 text-lg">등록된 UP 링크가 없습니다.</div>`; }

    panel.innerHTML = `
        <div class="p-6 border-b-[4px] border-[#5D4037] bg-white flex justify-between items-center shadow-sm z-10 shrink-0">
            <div class="text-[22px] font-bold text-[#5D4037] font-paperozi flex items-center gap-2">
                <i class="fi fi-rr-arrow-up-right"></i> UP 해줘!
            </div>
            <button onclick="closeSidePanel()" class="text-3xl text-[#5D4037] hover:text-red-500 cursor-pointer"><i class="fi fi-rr-cross-small"></i></button>
        </div>
        <div class="flex-1 p-5 bg-[#FFFDF5] overflow-y-auto modal-scroll">
            ${upCardsHtml}
        </div>
    `;
}

async function loadSchedulesFromFirebase() {
    try {
        const eventPromises = Object.entries(collectionMap).map(([member, colName]) => getDocs(collection(db, colName)).then(snapshot => ({ type: 'event', member, colName, snapshot })));
        const memoPromises = Object.entries(memoCollectionMap).map(([member, colName]) => getDocs(collection(db, colName)).then(snapshot => ({ type: 'memo', member, colName, snapshot })));
        
        const results = await Promise.all([...eventPromises, ...memoPromises]);
        scheduleList = [];
        memoList = { '달타':[], '서피카':[], '다룽':[], '최또':[], '카나시':[] };
        
        results.forEach(({ type, member, colName, snapshot }) => {
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (type === 'memo') {
                    if(!memoList[member]) memoList[member] = [];
                    memoList[member].push({ id: doc.id, collectionName: colName, ...data });
                } else {
                    scheduleList.push({ id: doc.id, collectionName: colName, ...data });
                }
            });
        });

        for(let m in memoList) {
            memoList[m].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        }

        render();
    } catch (e) { console.error("데이터 불러오기 실패:", e); }
}

function changeTab(tabName) { 
    currentPage = tabName; 
    
    if (!isMobile) {
        if(tabName === '홈') {
            sidePanelMode = 'UP';
            openSidePanel('UP');
        } else {
            closeSidePanel(true);
        }
    } else {
        closeSidePanel(true);
    }
    
    homeTargetDate = new Date();
    individualTargetDate = new Date();
    
    renderHeaderTabs();
    render(); 
}

function changeMonth(delta) { currentMonth += delta; if (currentMonth > 12) { currentMonth = 1; currentYear++; } else if (currentMonth < 1) { currentMonth = 12; currentYear--; } render(); }
function changeHomeDate(delta) { homeTargetDate.setDate(homeTargetDate.getDate() + delta); render(); }
function changeIndividualWeek(deltaDays) { individualTargetDate.setDate(individualTargetDate.getDate() + deltaDays); render(); }

function openMonthPicker() { pickerYear = currentYear; renderPicker(); document.getElementById('monthPickerModal').classList.replace('hidden', 'flex'); }
function closeMonthPicker() { document.getElementById('monthPickerModal').classList.replace('flex', 'hidden'); }
function changePickerYear(delta) { pickerYear += delta; renderPicker(); }
function selectMonth(m) { 
    currentYear = pickerYear; currentMonth = m; 
    if (isMobile && currentPage !== '홈') individualTargetDate = new Date(currentYear, currentMonth - 1, 1);
    closeMonthPicker(); render(); 
}
function renderPicker() {
    document.getElementById('pickerYearText').innerText = `${pickerYear}년`;
    const grid = document.getElementById('pickerMonthGrid'); grid.innerHTML = '';
    for (let i = 1; i <= 12; i++) {
        const btn = document.createElement('button'); btn.innerText = `${i}월`;
        btn.className = (pickerYear === currentYear && i === currentMonth) ? 'month-btn active py-3.5 rounded-lg font-bold text-[20px]' : 'month-btn py-3.5 rounded-lg font-bold text-[20px]';
        btn.onclick = () => selectMonth(i); grid.appendChild(btn);
    }
}

function openMobileDatePicker() {
    datePickerCurrentDate = new Date(homeTargetDate.getTime());
    renderMobileDatePicker();
    document.getElementById('mobileDatePickerModal').classList.replace('hidden', 'flex');
}

function closeMobileDatePicker() {
    document.getElementById('mobileDatePickerModal').classList.replace('flex', 'hidden');
}

function changeDatePickerMonth(delta) {
    datePickerCurrentDate.setMonth(datePickerCurrentDate.getMonth() + delta);
    renderMobileDatePicker();
}

function selectMobileDate(y, m, d) {
    homeTargetDate = new Date(y, m, d);
    closeMobileDatePicker();
    render();
}

function renderMobileDatePicker() {
    const y = datePickerCurrentDate.getFullYear();
    const m = datePickerCurrentDate.getMonth();
    document.getElementById('datePickerTitle').innerText = `${y}년 ${m + 1}월`;

    const firstDay = new Date(y, m, 1).getDay();
    const startIdx = (firstDay === 0) ? 6 : firstDay - 1; 
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const grid = document.getElementById('datePickerGrid');
    let html = '';

    for (let i = 0; i < 42; i++) {
        const day = i - startIdx + 1;
        if (day > 0 && day <= daysInMonth) {
            const isSelected = (y === homeTargetDate.getFullYear() && m === homeTargetDate.getMonth() && day === homeTargetDate.getDate());
            const isRealToday = (y === new Date().getFullYear() && m === new Date().getMonth() && day === new Date().getDate());
            
            let classes = "py-2 rounded-lg cursor-pointer transition-colors text-[15px] ";
            if (isSelected) {
                classes += "bg-[#FF5252] text-white shadow-md";
            } else if (isRealToday) {
                classes += "bg-gray-200 text-[#5D4037]";
            } else {
                classes += "hover:bg-gray-100 text-[#5D4037]";
            }
            html += `<div class="${classes}" onclick="selectMobileDate(${y}, ${m}, ${day})">${day}</div>`;
        } else {
            html += `<div></div>`;
        }
    }
    grid.innerHTML = html;
}

function buildScheduleCardHtml(sch, isMobileCard = false) {
    const color = sch.globalType === '휴방' ? '#9CA3AF' : 'var(--theme-color)';
    const bgColor = sch.globalType === '휴방' ? '#F9FAFB' : '#FFF5F5';
    const formattedTime = formatTime12(sch.time) || ''; const broadType = sch.broadType || '';

    const cardThemeColor = themeColors[sch.tabOrMember] || '#5D4037';
    const cardBroadColor = broadType === '합방' ? '#1b3420' : cardThemeColor;

    const timeSize = isMobileCard ? '11px' : '12px'; 
    const titleSize = isMobileCard ? '12px' : '18px';

    return `
        <div class="schedule-card ${sch.globalType === '휴방' ? 'hubang' : 'bangon'} h-full flex flex-col justify-center w-full" 
             style="color: ${color}; background-color: ${bgColor}; padding: ${isMobileCard ? '4px' : '4px'}; border-radius: 12px !important; box-shadow: 2px 2px 0px 0px rgba(0,0,0,0.2) !important;" 
             onclick="openDetailModal(event, '${sch.id}')" 
             oncontextmenu="if(typeof isAdmin !== 'undefined' && isAdmin) { event.preventDefault(); event.stopPropagation(); window.contextTargetId = '${sch.id}'; window.editFromMenu(); }">
             <div class="w-full flex justify-between items-center px-1 mb-0.5" style="font-size: ${timeSize}; font-weight: 700;">
                <span style="color: ${sch.globalType === '휴방' ? 'inherit' : cardBroadColor};">${broadType}</span><span>${formattedTime}</span>
             </div>
             <div class="flex-1 flex items-center justify-center w-full px-1 py-1">
                <span class="schedule-text font-paperozi leading-snug" style="font-size: ${titleSize} !important;">${sch.title}</span>
            </div>
        </div>
    `;
}

function render() {
    const tabBackgrounds = { '홈': '#ffdddd', '달타': '#FFFDE7', '서피카': '#FFF5F9', '다룽': '#E3F2FD', '최또': '#FCE4EC', '카나시': '#FFF3E0' };
    document.body.style.backgroundColor = tabBackgrounds[currentPage] || '#ffdddd';
    document.documentElement.style.setProperty('--theme-color', themeColors[currentPage]);
    
    const mBtnContainer = document.getElementById('mobileHeaderRightBtn');
    const dBtnContainer = document.getElementById('dynamicSideBtn');
    
    const mobileUpBtnHtml = `<button onclick="toggleUpPanel()" class="px-3 py-[6px] bg-[#f3f4f6] text-[#5D4037] font-bold rounded-lg transition-all shadow-sm font-paperozi text-[14px] cursor-pointer flex items-center gap-1 border border-gray-200"><i class="fi fi-rr-arrow-up-right"></i> UP</button>`;
    const mobileMemoBtnHtml = `<button onclick="toggleMemoPanel()" class="px-3 py-[6px] bg-[#f3f4f6] text-[#5D4037] font-bold rounded-lg transition-all shadow-sm font-paperozi text-[14px] cursor-pointer flex items-center gap-1 border border-gray-200"><i class="fi fi-rr-edit"></i> 메모</button>`;

    const desktopUpBtnHtml = `<button onclick="toggleUpPanel()" class="px-6 py-2.5 bg-white text-[#5D4037] font-bold rounded-xl hover:bg-[#5D4037] hover:text-white transition-all shadow-sm font-paperozi text-[18px] cursor-pointer flex items-center gap-2 border-2 border-gray-200"><i class="fi fi-rr-arrow-up-right"></i> UP</button>`;
    const desktopMemoBtnHtml = `<button onclick="toggleMemoPanel()" class="px-6 py-2.5 bg-white text-[#5D4037] font-bold rounded-xl hover:bg-[#5D4037] hover:text-white transition-all shadow-sm font-paperozi text-[18px] cursor-pointer flex items-center gap-2 border-2 border-gray-200"><i class="fi fi-rr-edit"></i> 메모</button>`;

    if (mBtnContainer) mBtnContainer.innerHTML = (currentPage === '홈') ? mobileUpBtnHtml : mobileMemoBtnHtml;
    if (dBtnContainer) dBtnContainer.innerHTML = (currentPage === '홈') ? desktopUpBtnHtml : desktopMemoBtnHtml;
    
    const content = document.getElementById('mainContent'); if(!content) return; content.innerHTML = '';
    
    const grouped = {};
    scheduleList.forEach(sch => {
        if(!sch.startDate || !sch.endDate) return;
        let start = new Date(sch.startDate); let end = new Date(sch.endDate); start.setHours(0,0,0,0); end.setHours(0,0,0,0);
        for(let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}-${sch.tabOrMember}`;
            if(!grouped[key]) grouped[key] = []; grouped[key].push(sch);
        }
    });

    if (isMobile) {
        if (currentPage === '홈') renderMobileHome(grouped);
        else renderMobileIndividual(grouped);
    } else {
        if (currentPage === '홈') renderDesktopHome(grouped);
        else renderDesktopIndividual(grouped);
    }
}

function renderMobileHome(grouped) {
    const content = document.getElementById('mainContent');
    const d = homeTargetDate;
    const dateStr = `${d.getMonth()+1}.${d.getDate()}`;
    const dayStr = ['일','월','화','수','목','금','토'][d.getDay()];

    let html = `
        <div class="w-full flex justify-between items-center mb-5 px-4 mt-2">
            <button onclick="changeHomeDate(-1)" class="p-2 flex items-center justify-center text-[#5D4037] hover:scale-110 transition-transform"><i class="fi fi-rr-angle-left text-3xl"></i></button>
            <div class="text-[22px] font-bold font-paperozi text-[#5D4037] cursor-pointer hover:opacity-70 transition-opacity flex items-center gap-2" onclick="openMobileDatePicker()">
                ${dateStr} (${dayStr}) <i class="fi fi-sr-caret-down text-sm mt-1"></i>
            </div>
            <button onclick="changeHomeDate(1)" class="p-2 flex items-center justify-center text-[#5D4037] hover:scale-110 transition-transform"><i class="fi fi-rr-angle-right text-3xl"></i></button>
        </div>
        <div class="grid grid-cols-1 gap-4 px-4 w-full">
    `;

    const rowBorderColors = ['#FBC02D', '#F06292', '#1E88E5', '#D81B60', '#F57C00'];
    members.forEach((member, i) => {
        const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}-${member.name}`;
        const daySchedules = grouped[key] || [];
        let schedulesHtml = '';

        if (daySchedules.length > 0) {
            const isHubang = daySchedules.some(s => s.globalType === '휴방');
            const imgSrc = isHubang ? memberCardImages[member.name].hubang : memberCardImages[member.name].bangon;

            if (isHubang) {
                schedulesHtml = `<div class="schedule-card hubang h-full flex items-center justify-center w-full overflow-hidden" style="color:#9CA3AF; background-color:#F3F4F6; padding:0; border-radius: 12px; box-shadow: 2px 2px 0px 0px rgba(0,0,0,0.2);" onclick="openAllSchedulesModal(event, '${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}', '${member.name}')"><img src="${imgSrc}" class="w-full h-full object-cover" alt="휴방"></div>`;
            } else {
                const borderColor = rowBorderColors[i];
                const bgColor = '#FFF5F5';
                schedulesHtml = `<div class="schedule-card h-full w-full flex items-center justify-center overflow-hidden" style="color: ${borderColor}; background-color: ${bgColor}; padding:0; border-radius: 12px; box-shadow: 2px 2px 0px 0px rgba(0,0,0,0.2);" onclick="openAllSchedulesModal(event, '${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}', '${member.name}')"><img src="${imgSrc}" class="w-full h-full object-cover" alt="뱅온"></div>`;
            }
        } else {
            schedulesHtml = `<div class="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50"><span class="text-gray-400 text-[15px] font-bold">일정 없음</span></div>`;
        }

        const borderColor = rowBorderColors[i];
        
        html += `
            <div class="flex w-full bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] border-[2.5px] overflow-hidden" style="border-color: ${borderColor}">
                <div class="w-1/2 aspect-square border-r-[2.5px] relative cursor-pointer p-0" style="border-color: ${borderColor}" onclick="openSmartLink('${member.link}')">
                    <img src="${member.img}" class="w-full h-full object-cover">
                </div>
                <div class="w-1/2 aspect-square p-2 flex flex-col justify-center gap-2 bg-[#FFFDF5] overflow-y-auto" onclick="handleDayClick(${d.getFullYear()}, ${d.getMonth()+1}, ${d.getDate()}, '${member.name}')" oncontextmenu="handleDayRightClick(event, ${d.getFullYear()}, ${d.getMonth()+1}, ${d.getDate()}, '${member.name}')">
                    ${schedulesHtml}
                </div>
            </div>
        `;
    });
    html += `</div>`;
    content.innerHTML = html;
    content.className = 'shrink-0 transition-all duration-300 w-full max-w-[600px] mx-auto pb-6';
}

function renderMobileIndividual(grouped) {
    const content = document.getElementById('mainContent');
    const realToday = new Date();
    
    const current = new Date(individualTargetDate);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));

    let weekDates = [];
    for(let i=0; i<7; i++) {
        weekDates.push(new Date(monday.getTime() + i*24*60*60*1000));
    }

    const monthStr = `${weekDates[0].getMonth()+1}월`;
    const themeColor = themeColors[currentPage];

    let html = `
        <div class="w-full flex justify-between items-center mb-5 px-4 mt-2">
            <button onclick="changeIndividualWeek(-7)" class="p-2 flex items-center justify-center text-[#5D4037] hover:scale-110 transition-transform"><i class="fi fi-rr-angle-left text-3xl"></i></button>
            <div class="text-[20px] font-bold font-paperozi text-[#5D4037] cursor-pointer hover:opacity-70 transition-opacity flex items-center gap-2" onclick="openMonthPicker()">
                ${weekDates[0].getFullYear()}년 ${monthStr} 주간 <i class="fi fi-sr-caret-down text-sm mt-1"></i>
            </div>
            <button onclick="changeIndividualWeek(7)" class="p-2 flex items-center justify-center text-[#5D4037] hover:scale-110 transition-transform"><i class="fi fi-rr-angle-right text-3xl"></i></button>
        </div>
        <div class="grid grid-cols-1 gap-4 px-4 w-full">
    `;

    const daysLabel = ['월','화','수','목','금','토','일'];
    weekDates.forEach((d, i) => {
        const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}-${currentPage}`;
        const daySchedules = grouped[key] || [];
        let schedulesHtml = daySchedules.map(sch => buildScheduleCardHtml(sch, true)).join('');

        const isToday = d.getFullYear() === realToday.getFullYear() && d.getMonth() === realToday.getMonth() && d.getDate() === realToday.getDate();
        
        if (!schedulesHtml) {
            schedulesHtml = `<div class="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50"><span class="text-gray-400 text-[14px] font-bold">일정 없음</span></div>`;
        }

        html += `
            <div class="flex w-full bg-[#FFFDF5] rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] border-[1.5px] cursor-pointer transition-transform hover:-translate-y-1 min-h-[90px]" style="border-color: ${isToday ? themeColor : '#e5e7eb'}; color: ${isToday ? themeColor : '#3E2723'}" onclick="handleDayClick(${d.getFullYear()}, ${d.getMonth()+1}, ${d.getDate()}, '${currentPage}')" oncontextmenu="handleDayRightClick(event, ${d.getFullYear()}, ${d.getMonth()+1}, ${d.getDate()}, '${currentPage}')">
                <div class="w-[75px] shrink-0 flex flex-col items-center justify-center border-r-[1.5px]" style="border-color: ${isToday ? themeColor : '#e5e7eb'}; background-color: ${isToday ? themeColor : '#ffffff'}; color: ${isToday ? 'white' : 'inherit'}; border-top-left-radius: 10px; border-bottom-left-radius: 10px;">
                    <span class="text-[14px] font-bold mb-0.5 opacity-80">${daysLabel[i]}</span>
                    <span class="text-[26px] font-bold">${d.getDate()}</span>
                </div>
                <div class="flex-1 p-2 flex flex-col justify-center gap-2 overflow-y-auto bg-white" style="border-top-right-radius: 10px; border-bottom-right-radius: 10px;">
                    ${schedulesHtml}
                </div>
            </div>
        `;
    });
    html += `</div>`;
    content.innerHTML = html;
    content.className = `shrink-0 transition-all duration-300 w-full max-w-[600px] mx-auto pb-6 theme-${currentPage === '달타'?'dalta':currentPage === '서피카'?'seopika':currentPage === '다룽'?'darung':currentPage === '최또'?'choitto':'kanasi'}`;
}

function renderDesktopHome(grouped) {
    const content = document.getElementById('mainContent');
    const realToday = new Date();
    const logoImgUrl = "https://i.namu.wiki/i/TJgdKNl8C9pH3EUWbPBNXf8x8nqSfvHC6s7RFIrJpa1q5ZfF5C-ZSZAfVwkc2Cg7fEL3g-_BDyVu0_jnM64v3tzxwaxRpbY0mGi5IqnLninFRLDRo8saqkm7t6dCsymt77vsMQpCs8--nkcxqxADOg.webp";
    
    const today = new Date(); const diff = today.getDay() === 0 ? -6 : 1 - today.getDay();
    const monday = new Date(today); monday.setDate(today.getDate() + diff);
    const weekDates = Array.from({length: 7}, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
    const daysLabel = ['월', '화', '수', '목', '금', '토', '일'];
    
    const headerHtml = weekDates.map((d, i) => {
        let c = ''; if (i === 5) c = 'text-blue-600'; if (i === 6) c = 'text-red-600';
        const isToday = d.getFullYear() === realToday.getFullYear() && d.getMonth() === realToday.getMonth() && d.getDate() === realToday.getDate();
        const dateStr = `${d.getMonth() + 1}.${d.getDate()}`;
        const displayDate = isToday ? `<span class="bg-[#5D4037] text-white px-2 py-0.5 rounded-md">${dateStr}</span>` : dateStr;
        return `<div class="header-days-cell ${c}"><div class="leading-none mb-1">${daysLabel[i]}</div><div class="text-[14px] text-gray-500 font-bold font-paperozi">${displayDate}</div></div>`;
    }).join('');

    const rowBgColors = ['#FFFDE7', '#FFF5F9', '#E3F2FD', '#FFF0F5', '#FFF3E0'];
    const rowBorderColors = ['#FBC02D', '#F06292', '#1E88E5', '#D81B60', '#F57C00'];

    let homeHtml = `<div class="home-white-box"><div class="mb-8 w-full"><div class="flex gap-[22px] justify-center items-end"><div class="w-[277px] flex items-center justify-center pb-2"><img src="${logoImgUrl}" alt="SIGNAL Logo" style="height: 110px; object-fit: contain; transition: transform 0.2s;" class="cursor-pointer hover:scale-105" onclick="changeTab('홈')"></div><div class="header-days-container">${headerHtml}</div></div></div><div class="weekly-grid">`;

    members.forEach((member, i) => {
        let daysCellsHtml = '';
        weekDates.forEach(d => {
            const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}-${member.name}`;
            const daySchedules = grouped[key] || [];
            let schedulesHtml = '';

            if (daySchedules.length > 0) {
                const isHubang = daySchedules.some(s => s.globalType === '휴방');
                const borderColor = isHubang ? '#9CA3AF' : rowBorderColors[i]; 
                const bgColor = isHubang ? '#F3F4F6' : rowBgColors[i];
                const imgSrc = isHubang ? memberCardImages[member.name].hubang : memberCardImages[member.name].bangon;
                
                schedulesHtml = `<div class="schedule-card w-full h-full flex items-center justify-center overflow-hidden" style="color: ${borderColor}; background-color: ${bgColor}; padding:0; border-radius: 4px;" onclick="openAllSchedulesModal(event, '${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}', '${member.name}')"><img src="${imgSrc}" class="w-full h-full object-cover" style="border-radius: inherit;" alt="${isHubang ? '휴방' : '뱅온'}"></div>`;
            }
            daysCellsHtml += `<div class="day-cell" onclick="handleDayClick(${d.getFullYear()}, ${d.getMonth()+1}, ${d.getDate()}, '${member.name}')" oncontextmenu="handleDayRightClick(event, ${d.getFullYear()}, ${d.getMonth()+1}, ${d.getDate()}, '${member.name}')"><div class="schedule-list w-full h-full">${schedulesHtml}</div></div>`;
        });

        homeHtml += `<div class="week-row row-${i+1}"><div class="profile-cell" ${member.link ? `onclick="openSmartLink('${member.link}')"` : ''}><img src="${member.img}" alt="${member.name}" style="width: 100%; height: 100%; object-fit: cover;"></div><div class="days-container">${daysCellsHtml}</div></div>`;
    });
    content.innerHTML = homeHtml + `</div></div>`;
    content.className = 'shrink-0 transition-all duration-300 w-full lg:w-auto';
}

function renderDesktopIndividual(grouped) {
    const content = document.getElementById('mainContent');
    const realToday = new Date();
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay(); const startIdx = (firstDay === 0) ? 6 : firstDay - 1; const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const cellsHtml = Array.from({length: 35}, (_, i) => {
        const day = i - startIdx + 1;
        if (day > 0 && day <= daysInMonth) {
            const key = `${currentYear}-${currentMonth}-${day}-${currentPage}`; const daySchedules = grouped[key] || [];
            const schedulesHtml = daySchedules.map(sch => buildScheduleCardHtml(sch, false)).join('');
            const isToday = currentYear === realToday.getFullYear() && currentMonth === realToday.getMonth() + 1 && day === realToday.getDate();
            const displayDay = isToday ? `<span class="bg-[#5D4037] text-white w-7 h-7 inline-flex items-center justify-center rounded-md">${day}</span>` : `<span>${day}</span>`;
            return `<div class="big-cell" onclick="handleDayClick(${currentYear}, ${currentMonth}, ${day}, '${currentPage}')" oncontextmenu="handleDayRightClick(event, ${currentYear}, ${currentMonth}, ${day}, '${currentPage}')"><div class="w-full flex justify-between items-center mb-1 px-1">${displayDay}</div><div class="w-full flex-1 overflow-y-auto schedule-list flex flex-col gap-1">${schedulesHtml}</div></div>`;
        }
        return `<div class="big-cell cursor-default hover:bg-transparent hover:transform-none hover:shadow-none hover:border-dashed"></div>`;
    }).join('');

    content.innerHTML = `<div class="big-white-box relative theme-${currentPage === '달타'?'dalta':currentPage === '서피카'?'seopika':currentPage === '다룽'?'darung':currentPage === '최또'?'choitto':'kanasi'}">
        <div class="nav-container"><button class="nav-btn" onclick="changeMonth(-1)"><i class="fi fi-rr-caret-left"></i></button><div class="w-[330px] flex justify-center items-center"><div class="text-[40px] font-normal cursor-pointer hover-theme-text leading-none" style="font-family: 'DnfBitbeatV2', sans-serif;" onclick="openMonthPicker()">${currentYear}년 ${currentMonth}월</div></div><button class="nav-btn" onclick="changeMonth(1)"><i class="fi fi-rr-caret-right"></i></button></div><div class="header-days-container mb-2">${['월','화','수','목','금','토','일'].map(d=>`<div class="header-days-cell" style="padding:22px 0;">${d}</div>`).join('')}</div><div class="big-box-container">${cellsHtml}</div></div>`;
    content.className = 'shrink-0 transition-all duration-300 w-full lg:w-auto';
}

async function deleteScheduleAction() {
    if(!contextTargetId) return;
    if (confirm('해당 일정을 삭제하시겠습니까?')) {
        const sch = scheduleList.find(s => s.id === contextTargetId);
        if(!sch) return;
        try {
            await deleteDoc(doc(db, sch.collectionName, contextTargetId));
            scheduleList = scheduleList.filter(s => s.id !== contextTargetId); 
            closeEditModal();
            render();
        } catch(e) { console.error("삭제 실패:", e); }
    }
}

async function saveSchedule() {
    const globalType = document.querySelector('input[name="globalSchType"]:checked').value;
    const isHubang = globalType === '휴방';
    const memberTab = targetModalContext.member;
    const colName = collectionMap[memberTab];
    if(!colName) { alert("저장할 멤버 정보가 올바르지 않습니다."); return; }

    for (let oldId of currentEditingIds) {
        const oldSch = scheduleList.find(s => s.id === oldId);
        if (oldSch) { try { await deleteDoc(doc(db, oldSch.collectionName, oldId)); } catch(e) {} }
    }
    scheduleList = scheduleList.filter(s => !currentEditingIds.includes(s.id));

    const blocks = document.querySelectorAll('#scheduleInputsContainer .schedule-input-block');
    for (const block of blocks) {
        const title = block.querySelector('.sch-title').value.trim();
        if (title) { 
            const sDate = block.querySelector('.sch-start').value; const eDate = block.querySelector('.sch-end').value;
            const ampm = block.querySelector('.sch-ampm').innerText; const hh = block.querySelector('.sch-hh').value; const mm = block.querySelector('.sch-mm').value;
            const broad = isHubang ? '' : block.querySelector('.sch-broad').value; const mem = isHubang ? '' : block.querySelector('.sch-mem').value.trim();
            const timeStr = isHubang ? '' : buildTimeStr(ampm, hh, mm); const desc = block.querySelector('.sch-desc').value.trim();
            const newSchedule = { tabOrMember: memberTab, globalType, title, startDate: sDate, endDate: eDate, time: timeStr, broadType: broad, memberTag: mem, detail: desc };
            
            try {
                const docRef = await addDoc(collection(db, colName), newSchedule);
                newSchedule.id = docRef.id; newSchedule.collectionName = colName; scheduleList.push(newSchedule);
            } catch(e) { console.error("저장 오류:", e); }
        }
    }
    closeScheduleModal(); render();
}

async function saveEditedSchedule() {
    if(!contextTargetId) return;
    const block = document.getElementById('editContainer').querySelector('.schedule-input-block');
    const title = block.querySelector('.sch-title').value.trim();
    if(!title) { alert("일정 제목을 입력해주세요."); return; }
    const globalType = document.querySelector('input[name="editGlobalSchType"]:checked').value;
    const isHubang = globalType === '휴방';
    const sDate = block.querySelector('.sch-start').value; const eDate = block.querySelector('.sch-end').value;
    const ampm = block.querySelector('.sch-ampm').innerText; const hh = block.querySelector('.sch-hh').value; const mm = block.querySelector('.sch-mm').value;
    const broad = isHubang ? '' : block.querySelector('.sch-broad').value; const mem = isHubang ? '' : block.querySelector('.sch-mem').value.trim();
    const timeStr = isHubang ? '' : buildTimeStr(ampm, hh, mm); const desc = block.querySelector('.sch-desc').value.trim();
    const updatedData = { globalType, title, startDate: sDate, endDate: eDate, time: timeStr, broadType: broad, memberTag: mem, detail: desc };
    const sch = scheduleList.find(s => s.id === contextTargetId); if(!sch) return;

    try {
        await updateDoc(doc(db, sch.collectionName, contextTargetId), updatedData);
        const idx = scheduleList.findIndex(s => s.id === contextTargetId);
        if(idx !== -1) scheduleList[idx] = { ...scheduleList[idx], ...updatedData };
        closeEditModal(); render();
    } catch(e) { console.error("수정 오류:", e); }
}

function formatTime12(timeStr) {
    if (!timeStr) return ''; const [hourStr, minute] = timeStr.split(':');
    let hour = parseInt(hourStr, 10); const ampm = hour >= 12 ? '오후' : '오전';
    hour = hour % 12; if (hour === 0) hour = 12; return `${ampm} ${hour}:${minute}`;
}

function buildTimeStr(ampm, hh, mm) {
    if (!hh) return ''; let h = parseInt(hh, 10); let m = mm ? parseInt(mm, 10) : 0;
    if (ampm === '오후' && h < 12) h += 12; if (ampm === '오전' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function toggleAmpm(btn) { btn.innerText = btn.innerText === '오후' ? '오전' : '오후'; }
function isDateStrInRange(targetDateStr, startStr, endStr) {
    const t = new Date(targetDateStr).setHours(0,0,0,0); const s = new Date(startStr).setHours(0,0,0,0); const e = new Date(endStr).setHours(0,0,0,0);
    return t >= s && t <= e;
}

function toggleFields(modalId, radioName) {
    const modal = document.getElementById(modalId); if(!modal) return;
    const radio = modal.querySelector(`input[name="${radioName}"]:checked`); if (!radio) return;
    const isHubang = radio.value === '휴방';
    modal.querySelectorAll('.optional-field').forEach(el => { el.style.display = isHubang ? 'none' : ''; });
}

function handleAdminClick() { if (!isAdmin) openPasswordModal(); }
function checkPassword() {
    const val = document.getElementById('pwInput').value; const user = adminPasswords[val]; 
    if (user) {
        isAdmin = true; loggedInUser = user;
        sessionStorage.setItem('isAdmin', 'true');
        sessionStorage.setItem('loggedInUser', JSON.stringify(user));
        
        updateLoginUI(user);
        alert(`${user.name}님 환영합니다!`); document.getElementById('pwInput').value = ''; closePasswordModal();
    } else { alert('비밀번호가 틀렸습니다.'); document.getElementById('pwInput').value = ''; }
}

function logoutAdmin() {
    isAdmin = false; loggedInUser = null;
    sessionStorage.clear(); 
    
    const desktopContainer = document.getElementById('desktopAuthContainer');
    if(desktopContainer) desktopContainer.innerHTML = `<button class="font-paperozi bg-white border-2 border-gray-200 px-4 py-2 rounded-xl font-bold text-lg text-[#5D4037] hover:bg-[#5D4037] hover:border-[#5D4037] hover:text-white transition-all duration-200 shadow-sm" onclick="handleAdminClick()">로그인</button>`;
    const mobileContainer = document.getElementById('mobileAuthContainer');
    if(mobileContainer) mobileContainer.innerHTML = `<button class="font-paperozi bg-white border border-gray-200 px-2 py-[5px] rounded-lg font-bold text-[13px] text-[#5D4037] hover:bg-[#5D4037] hover:text-white transition-all shadow-sm" onclick="handleAdminClick()">로그인</button>`;
    
    closeSidePanel();
    localStorage.removeItem('com.naver.nid.access_token'); localStorage.removeItem('com.naver.nid.oauth.state_token');
    alert('로그아웃 되었습니다.'); window.location.reload(); 
}

function openPasswordModal() { document.getElementById('passwordModal').classList.replace('hidden', 'flex'); }
function closePasswordModal() { document.getElementById('passwordModal').classList.replace('flex', 'hidden'); }
function closeLogoutModal() { document.getElementById('logoutModal').classList.replace('flex', 'hidden'); }

function handleDayClick(year, month, day, member) { 
    const dateStr = `${year}-${month}-${day}`;
    openAllSchedulesModal(null, dateStr, member); 
}

function handleDayRightClick(event, year, month, day, member) {
    event.preventDefault();
    if (!isAdmin) return;
    openScheduleModal(year, month, day, member);
}

function getScheduleFormHTML(data, isDeletable = true) {
    const id = data.id || ''; const title = data.title || ''; const sDate = data.startDate || ''; const eDate = data.endDate || '';
    const broad = data.broadType || '개인방송'; const mem = data.memberTag || ''; const desc = data.detail || '';
    let hh = '', mm = '', ampm = '오후';
    if (data.time) { let [h, m] = data.time.split(':'); h = parseInt(h, 10); ampm = h >= 12 ? '오후' : '오전'; h = h % 12; if (h === 0) h = 12; hh = h; mm = m; }
    
    const deleteBtnHtml = isDeletable ? `<button type="button" class="absolute top-2 right-4 text-[#5D4037] text-[35px] font-bold flex items-center justify-center hover:scale-110 transition-all z-10" onclick="this.closest('.schedule-input-block').remove()" title="일정 삭제"><i class="fi fi-sr-minus-small"></i></button>` : '';

    return `
        <div class="schedule-input-block border-2 border-[#5D4037] p-5 rounded-xl bg-white relative shadow-sm pretendard mt-1">
            ${deleteBtnHtml} <input type="hidden" class="sch-id" value="${id}">
            <div class="mb-4 pr-8"><label class="block text-[13px] text-gray-500 font-bold mb-1.5">일정 제목</label><input type="text" class="sch-title w-full border-2 border-[#5D4037] rounded-lg p-2.5 outline-none focus:border-[var(--theme-color)] text-[15px] font-medium" placeholder="일정 제목 입력" value="${title}"></div>
            <div class="mb-4"><label class="block text-[13px] text-gray-500 font-bold mb-1.5">날짜</label><div class="flex items-center gap-2"><input type="date" class="sch-start flex-1 border-2 border-[#5D4037] rounded-lg p-2 outline-none text-[14px] font-medium" value="${sDate}"><span class="font-bold text-[#5D4037]">~</span><input type="date" class="sch-end flex-1 border-2 border-[#5D4037] rounded-lg p-2 outline-none text-[14px] font-medium" value="${eDate}"></div></div>
            <div class="flex gap-4 mb-4 optional-field"><div class="flex-1"><label class="block text-[13px] text-gray-500 font-bold mb-1.5">시간</label><div class="flex items-center justify-between border-2 border-[#5D4037] rounded-lg p-1.5 bg-white"><button type="button" class="sch-ampm ampm-btn px-2.5 py-1 font-bold text-[#5D4037] rounded-md text-[13px]" onclick="toggleAmpm(this)">${ampm}</button><input type="number" min="1" max="12" class="sch-hh w-[38px] p-1 text-center font-bold text-[#5D4037] outline-none text-[15px]" placeholder="시" value="${hh}"><span class="font-bold text-[#5D4037]">:</span><input type="number" min="0" max="59" class="sch-mm w-[38px] p-1 text-center font-bold text-[#5D4037] outline-none mr-1 text-[15px]" placeholder="분" value="${mm}"></div></div><div class="flex-1"><label class="block text-[13px] text-gray-500 font-bold mb-1.5">유형</label><select class="sch-broad w-full border-2 border-[#5D4037] rounded-lg p-2.5 outline-none text-[15px] bg-white font-bold text-[#5D4037] cursor-pointer"><option value="개인방송" ${broad==='개인방송'?'selected':''}>개인방송</option><option value="합방" ${broad==='합방'?'selected':''}>합방</option><option value="시네티" ${broad==='시네티'?'selected':''}>시네티</option></select></div></div>
            <div class="mb-4 optional-field"><label class="block text-[13px] text-gray-500 font-bold mb-1.5">멤버</label><input type="text" class="sch-mem w-full border-2 border-[#5D4037] rounded-lg p-2.5 outline-none focus:border-[var(--theme-color)] text-[15px] font-medium" placeholder="멤버 태그 입력 (선택)" value="${mem}"></div>
            <div><label class="block text-[13px] text-gray-500 font-bold mb-1.5">상세</label><textarea class="sch-desc w-full border-2 border-[#5D4037] rounded-lg p-3 outline-none focus:border-[var(--theme-color)] text-[15px] resize-none h-[75px] font-medium" placeholder="상세 내용을 입력하세요 (선택)">${desc}</textarea></div>
        </div>
    `;
}

function openScheduleModal(year, month, day, member) {
    targetModalContext = { year, month, day, member }; document.getElementById('scheduleModalDate').innerText = `${year}년 ${month}월 ${day}일`;
    const targetDateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const targets = scheduleList.filter(s => s.tabOrMember === member && isDateStrInRange(targetDateStr, s.startDate, s.endDate));
    currentEditingIds = targets.map(t => t.id); const container = document.getElementById('scheduleInputsContainer'); container.innerHTML = '';
    
    if (targets.length > 0) {
        document.querySelector(`input[name="globalSchType"][value="${targets[0].globalType}"]`).checked = true;
        targets.forEach(t => container.insertAdjacentHTML('beforeend', getScheduleFormHTML(t, true)));
    } else {
        document.querySelector('input[name="globalSchType"][value="뱅온"]').checked = true;
        container.insertAdjacentHTML('beforeend', getScheduleFormHTML({ startDate: targetDateStr, endDate: targetDateStr }, true));
    }
    document.getElementById('scheduleModal').classList.replace('hidden', 'flex'); toggleFields('scheduleModal', 'globalSchType');
}

function addScheduleInputBlock() {
    const { year, month, day } = targetModalContext; const targetDateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const container = document.getElementById('scheduleInputsContainer'); container.insertAdjacentHTML('beforeend', getScheduleFormHTML({ startDate: targetDateStr, endDate: targetDateStr }, true));
    container.scrollTop = container.scrollHeight; toggleFields('scheduleModal', 'globalSchType');
}
function closeScheduleModal() { document.getElementById('scheduleModal').classList.replace('flex', 'hidden'); }

function editFromMenu() {
    if(!contextTargetId) return; const sch = scheduleList.find(s => s.id === contextTargetId); if(!sch) return;
    document.querySelector(`input[name="editGlobalSchType"][value="${sch.globalType}"]`).checked = true;
    document.getElementById('editContainer').innerHTML = getScheduleFormHTML(sch, false);
    document.getElementById('editScheduleModal').classList.replace('hidden', 'flex'); toggleFields('editScheduleModal', 'editGlobalSchType');
}
function closeEditModal() { document.getElementById('editScheduleModal').classList.replace('flex', 'hidden'); contextTargetId = null; }

function renderSchedulesInModal(schedules, y, m, d, member) {
    const modal = document.getElementById('scheduleDetailModal'); const modalContent = modal.querySelector('.modal-content');
    modalContent.style.backgroundColor = '#FFFDF5'; modalContent.style.padding = '12px 20px 20px 20px';
    const closeBtnContainer = modal.querySelector('.justify-end.mb-2'); if (closeBtnContainer) closeBtnContainer.style.marginBottom = '0px';

    let htmlContent = '<div class="flex flex-col w-full max-h-[65vh] overflow-y-auto px-2 pt-2 pb-4 modal-scroll">';
    if (schedules.length === 0) {
        htmlContent += `<div class="text-center text-gray-500 font-bold mt-6 mb-4 text-lg">일정이 없습니다.</div>`;
    } else {
        schedules.forEach((sch, index) => {
            let timeText = sch.time ? formatTime12(sch.time) : ''; let broadText = sch.broadType || '개인방송'; let memText = sch.memberTag || ''; let detailText = sch.detail || '';
            let themeColor = themeColors[sch.tabOrMember] || '#5D4037';
            let isHabBang = broadText === '합방';
            let broadColor = isHabBang ? '#1b3420' : themeColor;
            
            let badgeHtml = sch.globalType === '휴방' ? '' : 
                `<div class="flex gap-2 justify-center">
                    ${timeText ? `<span class="px-4 py-1.5 bg-white text-[13px] font-bold rounded-full shadow-sm border-2" style="color: ${themeColor}; border-color: ${themeColor};">${timeText}</span>` : ''}
                    <span class="px-4 py-1.5 bg-white text-[13px] font-bold rounded-full shadow-sm border-2" style="color: ${broadColor}; border-color: ${broadColor};">${broadText}</span>
                </div>`;
                
            htmlContent += `<div class="flex flex-col w-full items-center"><div class="flex flex-col items-center gap-2 mb-4 w-full"><div class="text-[28px] font-bold text-[#000] text-center leading-tight break-keep font-paperozi">${sch.title}</div>${badgeHtml}</div><div class="flex flex-col gap-5 w-full pretendard px-3">${memText ? `<div class="flex flex-col"><div class="text-[13px] text-gray-400 font-bold mb-1">멤버</div><div class="text-[17px] text-[#5D4037] font-bold">${memText}</div></div>` : ''}${detailText ? `<div class="flex flex-col"><div class="text-[13px] text-gray-400 font-bold mb-1">상세</div><div class="text-[15px] text-[#5D4037] font-medium leading-relaxed whitespace-pre-wrap">${detailText}</div></div>` : ''}</div></div>`;
            if (index < schedules.length - 1) htmlContent += `<div class="w-full border-b-2 border-dashed border-[#5D4037] opacity-20 my-8"></div>`;
        });
    }
    htmlContent += '</div>';

    document.getElementById('detailDesc').innerHTML = htmlContent;
    const closeBtn = modal.querySelector('.modal-btn');
    if(closeBtn) { closeBtn.className = "modal-btn w-full bg-[#5D4037] text-white py-4 rounded-2xl font-bold text-[20px] mt-6 hover:brightness-110 transition-all cursor-pointer"; closeBtn.innerText = "닫기"; }
    modal.classList.replace('hidden', 'flex'); modal.style.display = '';
}

function openDetailModal(event, schId) { 
    event.stopPropagation(); 
    const sch = scheduleList.find(s => s.id === schId); 
    if(!sch) return; 
    renderSchedulesInModal([sch], null, null, null, null); 
}

function openAllSchedulesModal(event, dateStr, member) {
    if (event) event.stopPropagation(); 
    const [y, m, d] = dateStr.split('-'); 
    const targetDateStr = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    const allSchedules = scheduleList.filter(s => s.tabOrMember === member && isDateStrInRange(targetDateStr, s.startDate, s.endDate));
    renderSchedulesInModal(allSchedules, y, m, d, member);
}

function closeDetailModal() { const modal = document.getElementById('scheduleDetailModal'); modal.classList.replace('flex', 'hidden'); modal.style.display = ''; }

async function initApp() {
    const savedAdmin = sessionStorage.getItem('isAdmin');
    const savedUser = sessionStorage.getItem('loggedInUser');
    
    if (savedAdmin === 'true' && savedUser) {
        isAdmin = true;
        loggedInUser = JSON.parse(savedUser);
        updateLoginUI(loggedInUser);
    }

    initNaverLogin();
    await loadLinksFromFirebase();
    await loadSchedulesFromFirebase();
    
    if (!isMobile) {
        openSidePanel('UP'); 
    }
    
}

initApp();