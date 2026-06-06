export default async function handler(req, res) {
    let { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL이 필요합니다.' });
    }

    try {
        const botHeaders = {
            'User-Agent': 'facebookexternalhit/1.1; kakaotalk-scrap/1.0; Discordbot/2.0; Twitterbot/1.0;',
            'Accept': 'text/html,application/xhtml+xml,application/json',
        };

        // ----------------------------------------------------------------
        // [추가] 사용자가 '게시판 링크'를 넣었을 때 처리하는 로직
        // 예: https://ch.soop.st/유저ID/post/게시판번호
        // ----------------------------------------------------------------
        const boardRegex = /\/([a-zA-Z0-9_-]+)\/post\/(\d+)/;
        const match = url.match(boardRegex);

        if (match && !url.includes('/detail/')) {
            // 게시판 링크 분석 성공 (match[1]: 유저ID, match[2]: 게시판번호)
            const userId = match[1];
            const bbsNo = match[2];

            // 숲 내부의 실제 게시판 목록 불러오기 API 주소 (JSON 데이터 반환)
            const listApiUrl = `https://ch-api.soop.st/api/${userId}/board/${bbsNo}/list?page=1`;
            
            const listResponse = await fetch(listApiUrl, { headers: botHeaders });
            const listData = await listResponse.json();

            // 상단 고정(Pin)공지가 아닌, 진짜 일반 글 중에서 가장 최근 글 찾기
            // 데이터 구조상 일반 글은 보통 'pin' 값이 없거나 false입니다.
            const regularPosts = listData.data.filter(post => !post.is_pin && !post.pin); 
            
            if (regularPosts && regularPosts.length > 0) {
                const latestPostNo = regularPosts[0].title_no; // 가장 최근 글 번호
                // 기존 상세 페이지 주소로 url을 변경합니다.
                url = `https://ch.soop.st/${userId}/post/${bbsNo}/detail/${latestPostNo}`;
            } else if (listData.data && listData.data.length > 0) {
                // 고정글만 있다면 그냥 맨 위 글 가져옴
                url = `https://ch.soop.st/${userId}/post/${bbsNo}/detail/${listData.data[0].title_no}`;
            } else {
                return res.status(444).json({ error: '게시판에 작성된 글이 없습니다.' });
            }
        }
        // ----------------------------------------------------------------

        // 2단계: 최신 글 주소(또는 원래 상세글 주소)로 메타 태그 스크래핑 진행
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

        if (title.includes("SOOP is a space") || title === "SOOP" || title === "아프리카TV" || !title) {
            return res.status(404).json({ error: '보안 정책에 의해 내용이 가려졌습니다.' });
        }

        // 찾아낸 최종 상세 페이지 URL도 함께 반환해주면 유용합니다.
        res.status(200).json({ title, description, fetchedUrl: url });

    } catch (error) {
        console.error('서버 크롤링 에러:', error);
        res.status(500).json({ error: '서버에서 데이터를 가져오지 못했습니다.' });
    }
}