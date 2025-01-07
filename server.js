// 引入依赖
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const requestIp = require('request-ip');
const crypto = require('crypto'); // 用于生成设备指纹的哈希值
const { URL } = require('url'); // 用于验证 URL 格式

const app = express();
const ports = [3000]; // 监听的端口
const host = '0.0.0.0';

// === CORS 配置 ===
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: false,
    allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(bodyParser.json());
app.use(requestIp.mw()); // 使用 request-ip 中间件获取客户端 IP

// === URL 存储字典 ===
const urlMap = new Map();

// === 超时时间配置 ===
const EXPIRATION_TIME = 90 * 1000; // 超时时间为 90 秒
const CLEANUP_INTERVAL = 1 * 60 * 1000; // 每分钟清理一次过期数据

// === 定时清理过期数据 ===
setInterval(() => {
    const now = Date.now();
    const expiredTime = now - EXPIRATION_TIME;

    for (const [userId, { timestamp }] of urlMap) {
        if (timestamp < expiredTime) {
            console.log(`Deleting expired data for user: ${userId}`);
            urlMap.delete(userId); // 删除过期数据
        }
    }
}, CLEANUP_INTERVAL);

// === 辅助函数：生成设备指纹 ===
const generateDeviceFingerprint = (req) => {
    const ip = req.clientIp || '';
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const connection = req.headers['connection'] || '';
    const encoding = req.headers['accept-encoding'] || '';
    const forwardedFor = req.headers['x-forwarded-for'] || '';

    // 将关键信息合并生成唯一指纹
    const rawFingerprint = `${ip}-${userAgent}-${acceptLanguage}-${connection}-${encoding}-${forwardedFor}`;

    // 使用 SHA-256 哈希算法生成指纹
    const fingerprint = crypto.createHash('sha256').update(rawFingerprint).digest('hex');
    return fingerprint;
};

// === 存储 URL 的路由（处理 POST 请求） ===
app.post('/storeURL', (req, res) => {
    const url = req.body.url;
    const ip = req.clientIp;

    // === 验证 URL 是否存在并合法 ===
    if (!url) {
        return res.status(400).json({ error: 'URL is required.' });
    }
    try {
        new URL(url); // 验证 URL 格式
    } catch (err) {
        return res.status(400).json({ error: 'Invalid URL format.' });
    }

    // === 生成用户唯一标识符（包括 IP 和设备指纹） ===
    const deviceFingerprint = generateDeviceFingerprint(req);
    const userId = `${ip}-${deviceFingerprint}`; // 结合 IP 和设备指纹生成唯一标识符

    // === 存储数据到内存字典 ===
    urlMap.set(userId, { url, timestamp: Date.now() });
    console.log(`Stored URL for user: ${userId}`);
    res.json({ message: 'URL stored successfully.', userId });
});

// === 获取 URL 的路由（处理 GET 请求） ===
app.get('/getURL', (req, res) => {
    const ip = req.clientIp;

    // === 生成用户唯一标识符（包括 IP 和设备指纹） ===
    const deviceFingerprint = generateDeviceFingerprint(req);
    const userId = `${ip}-${deviceFingerprint}`;

    // === 获取数据并检查是否存在 ===
    if (urlMap.has(userId)) {
        const storedData = urlMap.get(userId);
        storedData.timestamp = Date.now(); // 更新数据时间戳以避免过期
        urlMap.set(userId, storedData); // 回写更新后的数据

        console.log(`Retrieved URL for user: ${userId}`);
        return res.json({ url: storedData.url });
    } else {
        console.error(`No URL found for user: ${userId}`);
        return res.status(404).json({ error: 'URL not found for this user.' });
    }
});

// === 启动服务器 ===
ports.forEach((port) => {
    app.listen(port, host, (err) => {
        if (err) {
            console.error(`Error starting server on port ${port}:`, err);
            return;
        }
        console.log(`Server listening on ${host}:${port}`);
    });
});
