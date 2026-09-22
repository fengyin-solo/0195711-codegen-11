#!/usr/bin/env node
/**
 * 本地开发静态服务器（零依赖）
 *
 * 用法：npm run serve [-- 端口号]
 * 默认：http://localhost:8081
 *
 * 测验清单通过 fetch('data/quiz-manifest.json') 加载，
 * 因此请使用本服务器（或任意 HTTP 服务器）访问页面，而不是直接双击打开 index.html。
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, extname, normalize } from 'node:path';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const port = Number(process.argv[2]) || 8081;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon'
};

const server = createServer(async (req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = normalize(resolve(root, '.' + urlPath));
    if (!filePath.startsWith(root)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    try {
        const data = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
        res.end(data);
    } catch {
        // 找不到文件时回退到 index.html（与容器内 nginx 配置一致）
        try {
            const fallback = await readFile(resolve(root, 'index.html'));
            res.writeHead(200, { 'Content-Type': MIME['.html'] });
            res.end(fallback);
        } catch {
            res.writeHead(404);
            res.end('Not found');
        }
    }
});

server.listen(port, () => {
    console.log(`光学设计实验室已启动：http://localhost:${port}`);

    // 可选：自动打开浏览器
    const opener = process.platform === 'darwin' ? 'open'
        : process.platform === 'win32' ? 'start' : 'xdg-open';
    try {
        const child = spawn(opener, [`http://localhost:${port}`], { stdio: 'ignore', detached: true });
        child.on('error', () => { /* 无浏览器可打开时忽略 */ });
        child.unref();
    } catch {
        /* 忽略自动打开失败 */
    }
});
