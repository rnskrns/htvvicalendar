export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL 필요' });

    try {
        const response = await fetch(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' 
            }
        });
        
        if (!response.ok) throw new Error('접근 실패');
        const html = await response.text();

        // 🚨 안전한 매칭: html이 null이 아니더라도 결과가 없을 수 있으므로 옵셔널 체이닝(?.) 사용
        const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"/i);
        const descMatch = html.match(/<meta property="og:description" content="([^"]*)"/i);

        const title = titleMatch ? titleMatch[1] : null;
        const description = descMatch ? descMatch[1] : '';

        // 데이터가 아예 없으면 404를 보내서 프론트엔드에서 버튼 모드로 전환하게 함
        if (!title) {
            return res.status(404).json({ error: '내용 없음' });
        }

        res.status(200).json({ title, description });
    } catch (error) {
        // 서버 에러(500)를 내지 말고, 무조건 404로 보내서 서버를 살림
        res.status(404).json({ error: '불러오기 실패' });
    }
}