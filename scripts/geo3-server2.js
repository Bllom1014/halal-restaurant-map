const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      fs.writeFileSync('/tmp/geo3_result.json', body);
      res.writeHead(200);
      res.end('ok');
      console.log('saved results');
    });
  } else {
    const file = '/Users/bloom/WorkBuddy/2026-08-11-14-35-22/halal-restaurant-map/scripts/geo3.html';
    if (!fs.existsSync(file)) {
      res.writeHead(404);
      return res.end('404');
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(file));
  }
});
server.listen(3459, () => console.log('geo3 server on :3459'));
