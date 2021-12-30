# SteamDomainFronting

通过域前置在墙内访问Steam国际服，原理应该类似于steamcommunity302（我没亲自用过steamcommunity302，不太清楚，但看软件描述感觉原理应该是差不多的）。

目前Steam的[商店页面](https://store.steampowered.com/)和[社区页面](https://steamcommunity.com/)都被GFW进行SNI检测，前者目前只是丢包干扰，时好时坏；后者则是自从挺久以前就被彻底封锁了。

出于好奇，就进行了这个蹩脚的域前置实验。

`SteamDomainFronting.js`使用NodeJS搭建了一个HTTP代理服务器，接受`HTTP CONNECT`请求，然后转发给Burp Suite，但如果发现域名是已经被SNI检测的上述两个（商店和社区），就先修改`HTTP CONNECT`请求头，把域名替换成`www.valvesoftware.com`，再转发给上游的Burp Suite。（之所以是替换成这个，首先肯定是因为它貌似还没被SNI检测；其次是访问这个域名的话，发现服务器证书里包含了不止一个域名，包括商店和社区，于是推测应该可以用于域前置，实际上也确实成功了；再其次，用它的话不需要让Burp Suite忽略证书错误）

修改Burp Suite的代理监听设置，默认监听的`127.0.0.1:8080`是根据请求的域名生成证书（Generate CA-signed per-host certificates），这个不用改；然后添加一个监听端口，监听`127.0.0.1:8081`，修改设置，在这个端口上只生成指定的域名（Generate a CA-signed certificate with a specific host name），指定为商店的域名；然后同理继续添加`127.0.0.1:8082`，指定为社区的域名。

然后再把Burp Suite的CA证书导入受信任的根证书颁发机构，这样Steam客户端就不会报证书错误了。

（当然，Burp Suite的Intercept需要关掉）

最终发现可以正常打开商店和社区，只是社区的讨论页仍然打不开，还是需要翻到墙外才能打开。
