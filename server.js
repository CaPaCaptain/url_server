// === 全局异常处理（放在顶部） ===
process.on('uncaughtException', (err) => {
    console.error('[Fatal Error] Uncaught Exception:', err.stack || err.message || err);
    process.exit(1); // 可选择退出服务进程
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Warning] Unhandled Rejection at:', promise, 'reason:', reason);
});

// === 引入依赖 ===
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const requestIp = require('request-ip');
const crypto = require('crypto'); // 用于生成设备指纹的哈希值
const { URL } = require('url');  // 用于验证 URL 格式

const app = express();

// === 配置常量 ===
const PORT = process.env.PORT || 7860; // 动态分配的端口
const HOST = '0.0.0.0';

// 检查 PORT 是否有效
if (!PORT) {
    console.error("[Error] PORT environment variable is undefined. This is required by Hugging Face Spaces.");
    process.exit(1); // 如果 PORT 未定义，立即退出
}

console.log(`Starting server with HOST: ${HOST}, PORT: ${PORT}`);

// === 中间件配置 ===
// CORS 配置
const corsOptions = {
    origin: '*', // 允许所有来源的请求
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
};
app.use(cors(corsOptions));

// 使用 Body-Parser 解析 JSON 请求体
app.use(bodyParser.json());

// 使用 request-ip 中间件获取客户端 IP
app.use(requestIp.mw());

// === 内存存储及清理 ===

// URL 存储字典（以用户唯一标识符为键）
const urlMap = new Map();

// 超时时间配置（以毫秒为单位）
const EXPIRATION_TIME = 90 * 1000; // 90 秒
const CLEANUP_INTERVAL = 60 * 1000; // 每 60 秒清理一次

// 定时清理过期数据
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

// 健康检查路由
app.get('/', (req, res) => {
    res.status(200).json({
        message: "Server is running with backup port.",
        port: PORT || "undefined",
        environment: process.env,
    });
});

// === 辅助函数 ===
// 生成设备指纹
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

// === 路由与业务逻辑 ===

// 存储 URL（POST 请求）
app.post('/storeURL', (req, res) => {
    const url = req.body.url; // 从请求体中解析 URL
    const ip = req.clientIp; // 获取客户端 IP

    // 验证 URL 是否存在并合法
    if (!url) {
        return res.status(400).json({ error: 'URL is required.' });
    }
    try {
        new URL(url); // 验证 URL 格式
    } catch (err) {
        return res.status(400).json({ error: 'Invalid URL format.' });
    }

    // 生成用户唯一标识符（包括 IP 和设备指纹）
    const deviceFingerprint = generateDeviceFingerprint(req);
    const userId = `${ip}-${deviceFingerprint}`; // 结合 IP 和设备指纹生成唯一标识符

    // 存储到字典中
    urlMap.set(userId, { url, timestamp: Date.now() });
    console.log(`Stored URL for user: ${userId}`);

    // 返回成功响应
    res.json({ message: 'URL stored successfully.', userId });
});

// 获取 URL（GET 请求）
app.get('/getURL', (req, res) => {
    const ip = req.clientIp; // 获取客户端 IP

    // 生成用户唯一标识符（包括 IP 和设备指纹）
    const deviceFingerprint = generateDeviceFingerprint(req);
    const userId = `${ip}-${deviceFingerprint}`;

    // 查询字典获取存储的 URL
    if (urlMap.has(userId)) {
        const storedData = urlMap.get(userId);
        storedData.timestamp = Date.now(); // 更新数据时间戳
        urlMap.set(userId, storedData); // 保存更新后的数据

        console.log(`Retrieved URL for user: ${userId}`);
        return res.json({ url: storedData.url });
    } else {
        console.error(`No URL found for user: ${userId}`);
        return res.status(404).json({ error: 'URL not found for this user.' });
    }
});

// === 启动服务器 ===
app.listen(PORT, HOST, (err) => {
    if (err) {
        console.error("[Error] Server failed to start:", err);
        process.exit(1); // 如果存在错误，立即退出
    }
    console.log(`Server successfully started on http://${HOST}:${PORT}`);
});

// 打印环境变量（调试使用）
console.log("Full Environment Variables:", process.env);
