export default async function handler(req, res) {
    let { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL이 필요합니다.' });
    }

    try {
        // 브라우저처럼 보이기 위한 일반 헤더 세팅 (숲 API 차단 방지)
        const commonHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/html, application/xhtml+xml',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Origin': 'https://ch.soop.st',
            'Referer': 'https://ch.soop.st/'
        };

        // 디스코드/카톡 봇 위장 헤더 (메타 태그 추출용)
        const botHeaders = {
            'User-Agent': 'facebookexternalhit/1.1; kakaotalk-scrap/1.0; Discordbot/2.0; Twitterbot/1.0;',
            'Accept': 'text/html,application/xhtml+xml',
        };

        // 1단계: 게시판 링크인지 확인하는 주소 분석 정규식
        const boardRegex = /\/([a-zA-Z0-9_-]+)\/post\/(\d+)/;
        const match = url.match(boardRegex);

        // 상세 페이지(/detail/)가 아닌 일반 게시판 주소일 때만 작동
        if (match && !url.includes('/detail/')) {
            const userId = match[1];
            const bbsNo = match[2];

            // 숲 내부 실제 게시판 목록 API 주소
            const listApiUrl = `https://ch-api.soop.st/api/${userId}/board/${bbsNo}/list?page=1`;
            
            // 숲 API 서버에 목록 요청 (일반 브라우저 헤더 사용)
            const listResponse = await fetch(listApiUrl, { headers: commonHeaders });
            
            if (!listResponse.ok) {
                console.error(`숲 API 요청 실패: 상태코드 ${listResponse.status}`);
                return res.status(400).json({ error: '숲 게시판 데이터를 가져오는 데 실패했습니다.' });
            }

            const listData = await listResponse.json();

            // 데이터가 올바르게 들어왔는지 검증
            if (listData && listData.data && listData.data.length > 0) {
                // 상단 고정(Pin)공지가 아닌 일반 글 필터링
                const regularPosts = listData.data.filter(post => !post.is_pin && !post.pin); 
                
                let latestPostNo;
                if (regularPosts && regularPosts.length > 0) {
                    latestPostNo = regularPosts[0].title_no; // 일반 글 중 최신 글
                } else {
                    latestPostNo = listData.data[0].title_no; // 일반 글이 없으면 고정글이라도 가져옴
                }

                // 🌟 중요: 주소를 최신 글의 '상세 페이지' 주소로 강제 변환!
                url = `https://ch.soop.st/${userId}/post/${bbsNo}/detail/${latestPostNo}`;
                console.log(`[성공] 최신 글 주소 추적 완료: ${url}`);
            } else {
                return res.status(404).json({ error: '게시판에 작성된 글이 없거나 비공개 게시판입니다.' });
            }
        }

        // 2단계: 최종 결정된 주소(상세글 주소)로 메타 태그 스크래핑 진행
        const response = await fetch(url, { headers: botHeaders });
        const html = await response.text();

        // 메타 태그 추출 함수
        const getMeta = (prop) => {
            const regex1 = new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i');
            const regex2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${prop}["']`, 'i');
            const match = html.match(regex1) || html.match(regex2);
            return match ? match[1] : '';
        };

        let title = getMeta('og:title');
        let description = getMeta('og:description');

        if (!title) {
            const titleMatch = html.match(/<title>(.*?)<\/title>/i);
            if (titleMatch) title = titleMatch[1];
        }

        const decodeHTML = (str) => {
            if (!str) return '';
            return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                       .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
        };

        title = decodeHTML(title);
        description = decodeHTML(description);

        // 예외 처리 걸러내기
        if (title.includes("SOOP is a space") || title === "SOOP" || title === "아프리카TV" || !title) {
            return res.status(404).json({ error: '보안 정책에 의해 내용이 가려졌습니다.', debugUrl: url });
        }

        // 최종 데이터 반환
        res.status(200).json({ title, description, fetchedUrl: url });

    } catch (error) {
        console.error('서버 크롤링 에러:', error);
        res.status(500).json({ error: '서버에서 데이터를 가져오지 못했습니다.' });
    }
}