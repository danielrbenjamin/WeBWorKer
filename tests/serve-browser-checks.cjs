// Run: node tests/serve-browser-checks.cjs, then open the printed local URL.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const target = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(target, (error, data) => {
        if (error) { res.writeHead(404).end(); return; }
        if (['/popup.html', '/onboarding.html'].includes(url.pathname)) {
            data = data.toString().replace('<head>', '<head><script src="/tests/extension-api-fixture.js"></script>');
        }
        res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'text/plain', 'Cache-Control': 'no-store' });
        res.end(data);
    });
});
server.listen(8137, '127.0.0.1', () => console.log('Browser checks: http://127.0.0.1:8137/tests/spoiler-guard.html\nPopup preview: http://127.0.0.1:8137/popup.html'));
