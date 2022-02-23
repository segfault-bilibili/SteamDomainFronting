# SteamDomainFronting

通过域前置在墙内访问Steam国际服，原理应该类似于steamcommunity302（我没亲自用过steamcommunity302，不太清楚，但看软件描述感觉原理应该是差不多的）。

目前Steam的[商店页面](https://store.steampowered.com/)和[社区页面](https://steamcommunity.com/)都被GFW进行SNI检测，前者目前只是丢包干扰，时好时坏；后者则是自从挺久以前就被彻底封锁了。

出于好奇，就进行了这个蹩脚的域前置实验。

简单说，虽然上述商店页面和社区页面被检测干扰了，但是[V社公司主页](https://www.valvesoftware.com/) 域名`www.valvesoftware.com`貌似还没被检测干扰。于是，只要在TLS握手时使用V社公司主页的域名，就可以作为伪装骗过GFW的检测干扰。握手完成后，因为V社公司主页背后的服务器看上去也可以反代上述商店页面和社区页面（甚至连HTTPS证书里都包含商店和社区的域名，所以还有一个好处就是不需要让Burp Suite忽略上游证书错误），所以就可以借此正常访问商店和社区了。

`SteamDomainFronting.js`使用NodeJS搭建了一个HTTP代理服务器，接受`HTTP CONNECT`请求，然后转发给Burp Suite，但如果发现域名是已经被SNI检测的上述两个（商店和社区），就先修改`HTTP CONNECT`请求头，把域名替换成`www.valvesoftware.com`，再转发给上游的Burp Suite。

修改系统全局代理设置，然后Steam也会遵守这个设置，走`SteamDomainFronting.js`监听的`127.0.0.1:18080`进行联网。

修改Burp Suite的代理监听设置，默认监听的`127.0.0.1:8080`是根据请求的域名生成证书（Generate CA-signed per-host certificates），这个不用改；然后添加一个监听端口，监听`127.0.0.1:8081`，修改设置，在这个端口上只生成指定的域名（Generate a CA-signed certificate with a specific host name），指定为商店的域名；然后同理继续添加`127.0.0.1:8082`，指定为社区的域名。（之所以这么麻烦，是因为Burp默认是按照HTTP CONNECT里包含的域名生成中间人证书的，然而这里都统一伪装成V社公司主页的域名了（真正要访问的域名，也就是商店或社区的域名，在HTTP Host头里），所以Steam客户端那边即使信任了Burp的根证书，校验域名的时候也会发现不符并报错。归根到底是我还不知道怎么才能让Burp生成同时含有多个域名的证书，也许可以手动生成一个证书，但我懒得搞了）

然后再把Burp Suite的CA证书导入受信任的根证书颁发机构，这样Steam客户端就不会报证书错误了。

（当然，Burp Suite的Intercept需要关掉）

最终发现可以正常打开商店和社区，只是社区的讨论页仍然打不开，还是需要翻到墙外才能打开。
