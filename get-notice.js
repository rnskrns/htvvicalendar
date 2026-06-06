export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL이 필요합니다.' });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html',
            }
        });
        
        if (!response.ok) throw new Error('페이지 접근 실패');
        const html = await response.text();

        // 1. 메타 데이터 추출 시도
        const getMeta = (prop) => {
            const regex = new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i');
            const match = html.match(regex);
            return match ? match[1] : null;
        };

        let title = getMeta('og:title') || html.match(/<title>(.*?)<\/title>/i)?.[1];
        let description = getMeta('og:description') || "";

        const decodeHTML = (str) => {
            if (!str) return '';
            return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
        };

        title = decodeHTML(title);
        description = decodeHTML(description);

        // 2. 비상 예외 처리: 데이터가 없으면 강제로 404를 내보내어 프론트엔드가 '직접 입력' 모드로 전환되게 함
        if (!title || title.includes("SOOP") || title.length < 5) {
            return res.status(404).json({ error: '정보 없음' });
        }

        res.status(200).json({ title, description });
    } catch (error) {
        console.error('크롤링 에러:', error);
        // 서버가 죽지 않고, 프론트엔드가 알 수 있게 404 에러를 보냄
        res.status(404).json({ error: '정보를 불러올 수 없음' });
    }
}