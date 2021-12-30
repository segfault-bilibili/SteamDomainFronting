const http = require('http');
const net = require('net');


//要进行域前置的域名列表
const steamDomains = [
"store.steampowered.com",//8081
"steamcommunity.com",//8082
];

//使用Burp Suite作为上游代理，通过修改HTTP CONNECT中的域名（而不修改被HTTPS加密的HTTP Host头）实现域前置裸连
//当然，需要系统信任Burp Suite的中间人CA证书
const upstreamAddr = '127.0.0.1';
const defaultUpsteamPort = '8080';
//在Burp Suite里按上述"要进行域前置的域名列表"顺序在Proxy Listeners里添加对应端口号，然后对应修改每个端口要生成证书的域名
//（主要是因为Burp Suite生成证书时，没有选项能直接生成包含多个域名的证书。理论上也可以自己手动生成这种证书，然后就不用折腾多个端口号了）
var upsteamPorts = {};
for (let i=0; i<steamDomains.length; i++) {
  upsteamPorts[steamDomains[i]] = (8081 + i) + "";
}

//把系统代理设置为本程序，Steam客户端就会遵守系统代理设置，从而通过域前置来达成裸连
const listenAddr = '127.0.0.1';
const listenPort = '18080';

//实验发现这样可以正常打开商店和社区，但社区的“讨论”无法打开，仍然需要翻出墙外才能打开“讨论”


var httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('okay');
});

httpServer.on('connect', function(req, socket, head) {
  socket.on('error', function (e) {
    socket.end();
  });

  var frontDomain = req.url;
  var upsteamPort = defaultUpsteamPort;
  var found = steamDomains.find((domain) => {
    if (domain === req.url.split(":")[0]) {
      var portPart = req.url.match(/:\d+$/);
      portPart = portPart != null ? portPart[0] : "";
      frontDomain = "www.valvesoftware.com" + portPart;
      upsteamPort = upsteamPorts[domain];
      console.log("Applied domain fronting: \"" + req.url + "\" disguised as \"" + frontDomain + "\"");
      return true;
    }
  });
  if (found) {
    var upstream = net.connect(upsteamPort, upstreamAddr, function () {
      upstream.write('CONNECT ' + frontDomain + ' ' +req.httpVersion + '\r\nHost: ' + frontDomain + '\r\n\r\n', function () {
        upstream.pipe(socket);
        socket.pipe(upstream);
      });
    });
    upstream.on('error', function(e) {
      console.log("Upstream proxy connection error: " + e);
      socket.end();
    });
  } else {
    console.log("Forwarded as-is: \"" + req.url + "\"");
    let urlsplit = req.url.split(':');
    let connaddr = urlsplit[0];
    let connport = urlsplit[1];
    if (connport == null) connport = '443';
    var conn = net.connect(connport, connaddr, function () {
      socket.write("HTTP/1.1 200 Connection Established\r\n\r\n", function () {
        conn.pipe(socket);
        socket.pipe(conn);
      });
    });
    conn.on('error', function(e) {
      socket.end();
    });
  }

});

httpServer.listen(18080, '127.0.0.1');
