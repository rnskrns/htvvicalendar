export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL 필요' });

    try {
        // 1. 구글 캐시 주소 생성
        const proxyUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
        
        // 2. SOOP 대신 구글 캐시 서버에 요청
        const response = await fetch(proxyUrl, {
            headers: {
                // 구글 캐시는 일반적인 브라우저로 접속하는 것을 선호합니다.
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html',
            }
        });
        
        if (!response.ok) throw new Error('구글 캐시 접근 실패');
        const html = await response.text();
        
        // 메타 데이터 추출
        const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"/i);
        const descMatch = html.match(/<meta property="og:description" content="([^"]*)"/i);

        // 데이터가 없으면 에러
        if (!titleMatch) throw new Error('데이터 없음');

        res.status(200).json({ 
            title: titleMatch[1], 
            description: descMatch ? descMatch[1] : '' 
        });
    } catch (error) {
        // 실패 시 404를 보내 프론트엔드가 '수동 입력' 버튼을 띄우게 함
        res.status(404).json({ error: '불러오기 실패' });
    }
}