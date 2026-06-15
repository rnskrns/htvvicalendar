const cron = require('node-cron');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, setDoc, addDoc, doc, query, where } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyCYU5fUl5HKlvix7da_muE12fwI34Zf4RY",
    authDomain: "htvvi-calendar.firebaseapp.com",
    projectId: "htvvi-calendar",
    storageBucket: "htvvi-calendar.firebasestorage.app",
    messagingSenderId: "629395623347",
    appId: "1:629395623347:web:64b75d50633ac275c58fc6",
    databaseURL: "https://htvvi-calendar-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

puppeteer.use(StealthPlugin());

async function updateDbStatus() {
    try {
        const now = new Date().getTime();
        await setDoc(doc(db, 'settings', 'db_status'), { lastUpdated: now });
        console.log("🔥 Firebase DB 상태 최신화 완료 (lastUpdated)");
    } catch(e) { console.error("상태 업데이트 실패:", e); }
}

async function runAllScrapers() {
  console.log('🕵️‍♂️ SOOP 자동화 스캔 프로세스 시작...');
  
  const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
      let hasChanges = false;

      // 1. 공지사항 스캔
      const noticeChanged = await checkMainNotice(browser);
      if (noticeChanged) hasChanges = true;

      // 2. UP 게시판 스캔
      const upChanged = await checkUpBoard(browser);
      if (upChanged) hasChanges = true;

      if (hasChanges) {
          await updateDbStatus();
      } else {
          console.log('✅ 새로운 글이 없습니다. 동기화 스킵.');
      }

  } catch (error) {
      console.error('❌ 스캔 프로세스 중 에러:', error);
  } finally {
      await browser.close();
      console.log('🕵️‍♂️ SOOP 스캔 프로세스 종료.');
  }
}

// ----------------------------------------------------
// 1. 메인 공지사항 감지 함수
// ----------------------------------------------------
async function checkMainNotice(browser) {
    console.log('▶️ 메인 공지사항 확인 중...');
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    let hasNewData = false;

    try {
        await page.goto(`https://ch.sooplive.com/htvv2i/post`, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const notices = await page.evaluate(() => {
            const elements = document.querySelectorAll('.post_list_item'); 
            return Array.from(elements).slice(0, 5).map(el => {
                const link = el.querySelector('a')?.href || '';
                const postId = link.split('/').pop().split('?')[0];
                return { postId, title: el.querySelector('.title_text')?.innerText || '제목 없음', link, date: new Date().toISOString().split('T')[0] };
            });
        });

        for (const notice of notices) {
            if (!notice.postId) continue;
            const q = query(collection(db, "events"), where("postId", "==", notice.postId));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.log(`[✨ 신규 공지 발견] : ${notice.title}`);
                const customDocId = `${notice.date}_SOOP_${notice.postId}`;
                const newEventData = {
                    postId: notice.postId,
                    title: `📢 SOOP 공지: ${notice.title}`,
                    type: "개인방송", members: "햇비",
                    noticeLink: notice.link, noticeTitle: notice.title,
                    noticeDesc: "SOOP 방송국에 새로운 공지사항이 등록되었습니다.",
                    imageUrl: "", startDate: notice.date, endDate: notice.date,
                    dateId: notice.date, time: "12:00", order: 0, updatedAt: new Date().getTime()
                };
                await setDoc(doc(db, 'events', customDocId), newEventData);
                hasNewData = true;
            }
        }
    } catch (e) { console.error('공지사항 확인 실패:', e); }
    finally { await page.close(); }
    
    return hasNewData;
}

// ----------------------------------------------------
// 2. UP 게시판 감지 함수 (+마감일, 본문 링크 추출)
// ----------------------------------------------------
async function checkUpBoard(browser) {
    console.log('▶️ UP 게시판(107444763) 확인 중...');
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    let hasNewData = false;

    try {
        await page.goto(`https://ch.sooplive.com/htvv2i/board/107444763`, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 목록에서 1차로 제목과 게시물 주소 파싱
        const upPosts = await page.evaluate(() => {
            const elements = document.querySelectorAll('.post_list_item'); 
            return Array.from(elements).slice(0, 5).map(el => {
                const link = el.querySelector('a')?.href || '';
                const postId = link.split('/').pop().split('?')[0];
                return { postId, title: el.querySelector('.title_text')?.innerText || '제목 없음', link };
            });
        });

        for (const post of upPosts) {
            if (!post.postId) continue;
            
            // DB에 있는지 검사
            const q = query(collection(db, "up"), where("postId", "==", post.postId));
            const querySnapshot = await getDocs(q);

            // 완전히 새로운 글이라면? -> 안으로 들어가서 내부 링크 추출
            if (querySnapshot.empty) {
                console.log(`[💦 신규 UP 컨텐츠 발견] : ${post.title} (내용 확인 중...)`);
                
                // 1. 마감일 자동 계산 (오늘 + 3일)
                const today = new Date();
                today.setDate(today.getDate() + 3);
                const deadlineStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

                // 2. 게시물 내용 안으로 진입하여 진짜 링크(구글 폼 등) 찾아오기
                const detailPage = await browser.newPage();
                await detailPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...');
                let innerLink = post.link; // 링크를 못 찾으면 기본값은 게시물 주소 자체로 둠

                try {
                    await detailPage.goto(post.link, { waitUntil: 'networkidle2' });
                    
                    const extracted = await detailPage.evaluate(() => {
                        // SOOP 본문 영역을 타겟팅
                        const contentArea = document.querySelector('.post_content') || document.querySelector('.view_content') || document.body;
                        if (!contentArea) return null;

                        const links = Array.from(contentArea.querySelectorAll('a'));
                        // 본문 안의 링크 중 SOOP 주소가 아닌 첫 번째 외부 링크 찾기
                        const targetLink = links.find(a => a.href && a.href.startsWith('http') && !a.href.includes('ch.sooplive.com'));
                        
                        return targetLink ? targetLink.href : null;
                    });

                    if (extracted) {
                        innerLink = extracted;
                        console.log(`🔗 본문 링크 추출 성공: ${innerLink}`);
                    } else {
                        console.log(`⚠️ 본문 외부 링크를 찾지 못해 게시물 주소로 대체합니다.`);
                    }
                } catch (err) {
                    console.error('내부 링크 추출 실패:', err);
                } finally {
                    await detailPage.close();
                }
                
                // 3. 완성된 데이터를 DB에 저장
                const newUpData = {
                    postId: post.postId,
                    title: post.title,
                    link: innerLink,        // 추출한 본문 링크!
                    deadline: deadlineStr,  // 3일 뒤 날짜!
                    createdAt: new Date()
                };

                await addDoc(collection(db, 'up'), newUpData);
                hasNewData = true;
            }
        }
    } catch (e) { console.error('UP 게시판 확인 실패:', e); }
    finally { await page.close(); }
    
    return hasNewData;
}

cron.schedule('*/20 * * * *', () => {
  runAllScrapers();
});

runAllScrapers();