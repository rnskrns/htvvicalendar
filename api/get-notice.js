export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL이 필요합니다.' });
    }

    try {
        // ✨ Microlink를 빼고, Vercel 서버가 직접 '사람의 브라우저(크롬)'인 척 위장하여 SOOP에 접속합니다!
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            }
        });
        
        const html = await response.text();

        // HTML 태그 속에서 제목과 내용을 귀신같이 찾아내는 정규식 함수
        function getMetaTag(htmlString, property) {
            const regex1 = new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
            const regex2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i');
            const match = htmlString.match(regex1) || htmlString.match(regex2);
            return match ? match[1] : '';
        }

        let title = getMetaTag(html, 'og:title');
        let description = getMetaTag(html, 'og:description');

        // og:title이 없으면 기본 <title> 태그에서 추출
        if (!title) {
            const titleMatch = html.match(/<title>(.*?)<\/title>/i);
            if (titleMatch) title = titleMatch[1];
        }

        // HTML 특수문자 깨짐(안&#39;뇽 -> 안'뇽) 복구 처리
        const decodeHTML = (str) => {
            return str.replace(/&amp;/g, '&')
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .replace(/&quot;/g, '"')
                      .replace(/&#39;/g, "'")
                      .replace(/&nbsp;/g, ' ');
        };

        title = decodeHTML(title);
        description = decodeHTML(description);

        // 여전히 방어막에 막혀 SOOP 기본 껍데기만 가져왔다면 에러 처리
        if (title.includes("SOOP is a space") || title === "SOOP" || title === "아프리카TV" || !title) {
            return res.status(404).json({ error: 'SOOP 보안에 의해 내용이 가려졌습니다.' });
        }

        // 성공적으로 알맹이를 훔쳐왔다면 프론트엔드로 전송!
        res.status(200).json({ 
            title: title, 
            description: description 
        });

    } catch (error) {
        console.error('서버 크롤링 에러:', error);
        res.status(500).json({ error: '데이터를 가져오지 못했습니다.' });
    }
}