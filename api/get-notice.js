export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL 필요' });

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        if (!response.ok) throw new Error('접근 차단');
        const html = await response.text();
        
        const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"/i);
        const descMatch = html.match(/<meta property="og:description" content="([^"]*)"/i);

        // 데이터가 없어도 에러를 내지 않고 빈 데이터를 보냄
        res.status(200).json({ 
            title: titleMatch ? titleMatch[1] : null, 
            description: descMatch ? descMatch[1] : '' 
        });
    } catch (error) {
        // 에러가 나도 서버가 죽지 않고 빈 값을 보냄
        res.status(200).json({ title: null, description: '' });
    }
}