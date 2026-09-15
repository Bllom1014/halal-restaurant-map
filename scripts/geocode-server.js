const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = 3457;
const ROOT = path.resolve(__dirname, '..');
const RESULT_FILE = '/tmp/geo_result.json';

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(path.join(__dirname, 'geocode.html')).pipe(res);
    return;
  }
  if (req.method === 'GET' && req.url === '/data.json') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    fs.createReadStream(path.join(ROOT, 'data', 'restaurants-data.json')).pipe(res);
    return;
  }
  if (req.method === 'POST' && req.url === '/save') {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      fs.writeFileSync(RESULT_FILE, Buffer.concat(chunks));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
      console.log('saved ' + RESULT_FILE);
    });
    return;
  }
  res.writeHead(404); res.end('404');
});
server.listen(PORT, () => console.log('geocode server on http://localhost:' + PORT));
