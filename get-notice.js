export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL이 필요합니다.' });
    }

    try {
        // ✨ 핵심 변경: Vercel 서버 IP 차단을 피하기 위해 무료 프록시(allorigins)를 경유합니다.
        // 이렇게 하면 SOOP 서버는 Vercel이 아니라 프록시 서버가 접속한 것으로 인식합니다.
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        
        const response = await fetch(proxyUrl);
        const proxyData = await response.json();
        
        if (!proxyData.contents) {
            return res.status(500).json({ error: '데이터를 가져오지 못했습니다.' });
        }

        const html = proxyData.contents;

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

        // 여전히 빈 껍데기라면 에러 반환
        if (title.includes("SOOP is a space") || title === "SOOP" || title === "아프리카TV" || !title) {
            return res.status(404).json({ error: '보안 정책에 의해 내용이 가려졌습니다.' });
        }

        res.status(200).json({ title, description });
    } catch (error) {
        console.error('서버 크롤링 에러:', error);
        res.status(500).json({ error: '서버에서 데이터를 가져오지 못했습니다.' });
    }
}