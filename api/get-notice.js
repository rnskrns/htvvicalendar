import chromium from 'chrome-aws-lambda';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL 필요' });

    let browser = null;
    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath,
            headless: true,
        });

        const page = await browser.newPage();
        // 봇 탐지를 피하기 위해 실제 브라우저처럼 설정
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.goto(url, { waitUntil: 'networkidle2' }); // 페이지가 완전히 로딩될 때까지 대기

        const data = await page.evaluate(() => {
            const title = document.querySelector('meta[property="og:title"]')?.content;
            const desc = document.querySelector('meta[property="og:description"]')?.content;
            return { title, desc };
        });

        await browser.close();
        res.status(200).json({ title: data.title, description: data.desc });
    } catch (error) {
        if (browser) await browser.close();
        res.status(404).json({ error: '수동 입력 모드 전환' });
    }
}