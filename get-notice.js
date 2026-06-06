export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL 필요' });

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        if (!response.ok) throw new Error('접근 차단');
        const html = await response.text();
        
        // 메타 데이터 추출 (가장 간단한 형태)
        const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"/i);
        const descMatch = html.match(/<meta property="og:description" content="([^"]*)"/i);

        if (!titleMatch) throw new Error('데이터 없음');

        res.status(200).json({ 
            title: titleMatch[1], 
            description: descMatch ? descMatch[1] : '' 
        });
    } catch (error) {
        // 서버에서 무슨 일이 있어도 404를 보내서 500 에러를 막습니다.
        res.status(404).json({ error: '수동 입력 필요' });
    }
}