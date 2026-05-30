// 예시: api/get-notice.js (Vercel 백엔드 코드)
export default async function handler(req, res) {
    const { url } = req.query;

    try {
        // 서버 단에서 외부 API를 호출하여 데이터를 긁어옴 (CORS 문제 없음!)
        const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
        const data = await response.json();

        if (data.status === 'success') {
            res.status(200).json({ 
                title: data.data.title, 
                description: data.data.description 
            });
        } else {
            res.status(404).json({ error: '데이터를 찾을 수 없습니다.' });
        }
    } catch (error) {
        res.status(500).json({ error: '서버 에러 발생' });
    }
}