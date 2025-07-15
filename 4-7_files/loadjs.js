/* eslint-disable */
(function () {
    /**
     * 判断是否为 pagemaker 的 发布态
     */
    var isPagemakerReleaseState = function() {
        var appName = window.location.pathname.replace(/^\//,'').replace(/\//g, '_').toUpperCase();
        return !!(sessionStorage.getItem('PAGEMAKER_RELEASE_STATE_' + appName) || window.PAGEMAKER_APP_INFO);
    }

    /**
     * 获取 pagemaker 环境信息
     */
    var getPagemakerEnv = function() {
        // 默认为非pagemaker环境与非线上环境
        var env = {
            isPagemaker: false,
            isOnline: false
        };

        // 通过域名 和 sessionStorage 判断是否为 pagemaker 环境
        if (/pagemaker/.test(location.host) || isPagemakerReleaseState()) {
            env.isPagemaker = true;
        }

        // TODO: 后面需要通过 pagemaker 的环境变量去判断是否为线上环境，目前只能通过域名判断
        if (/bce\.baidu\.com/.test(location.host)) {
            env.isOnline = true;
        }

        return env;
    }

    var isPagemaker = getPagemakerEnv().isPagemaker;

    /** 加载 script 脚本 */
    var loadScript = function (src) {
        var scriptNode = document.createElement('script');
        scriptNode.src = src;
        document.body.appendChild(scriptNode);
    }

    // IAM 模块路径判断
    var iamModule = function () {
        var parts = (location.href.split('~')[1] || '').split('&');
        var redirect = 'https://console.bce.baidu.com';
        var mobile = '***';
        var url = '';

        for (var i = 0; i < parts.length; i++) {
            if (parts[i].indexOf('redirect=') === 0) {
                redirect = parts[i].substr('redirect'.length + 1);
            }

            // 如果是二次验证则会携带加密手机号码
            if (parts[i].indexOf('mobile=') === 0) {
                mobile = parts[i].substr('mobile'.length + 1);
            }
        }

        if (/iam\/user\/v2\/activate/.test(location.hash)) {
            // 定向跳转至账户激活页面
            url = location.origin + '/index_bce_app.html?redirect=' + redirect + '#/accountActive';
        }
        else if (/iam\/user\/v2\/verify\/login/.test(location.hash)) {
            // 定向跳转至二次验证页面 & 携带加密电话号码
            url = location.origin + '/index_bce_app.html?mobile='+ mobile + '&redirect=' + redirect + '#/loginVerify';
        }
        else if (/qualify\/person/.test(location.hash)) {
            // 定向跳转至实名认证
            url = location.origin + '/index_bce_app.html?redirect=' + redirect + '#/personQualify';
        }
        else {
            url = location.origin + '/index_bce_app.html#/accountInfo';
        }
        return url;
    };

    // 主模块路径判断逻辑
    var judgeMoudle = function () {
        var url = location.origin + '/index_bce_app.html/#/';
        // billing模块,只跳转(财务总览页)
        if (/#\/account\/index/.test(location.hash)) {
            url += 'billingOverview';
            return url;
        }

        // ticket模块 跳转工单域
        if (/(\/ticket\/)|(^https?:\/\/ticket)/.test(location.href)) {
            url = 'https://ticket.bce.baidu.com/app/index.html#/ticketList';
            return url;
        }

        // iam模块
        if (/\/iam\//g.test(location.href)) {
            url = iamModule();
            return url;
        }

        /**
         * 对于已经接入移动端的模块，则跳转到对应的移动端产品页或者产品默认页面
         * 否则就不跳转
         */
        // var finishedModules = {
        //     home: {
        //         'default': 'dashboard'
        //     },
        //     bcc: {
        //         // BCC 现在只有 list 页面，不配置默认页面，让用户可以在PC版使用其它功能
        //         '/bcc/instance/list': 'bccInstance'
        //         // '/bcc/instance/create': 'bccPurchase'
        //     },
        //     cdn: {
        //         'default': 'cdnInstance',
        //         '/cdn/list': 'cdnInstance'
        //     },
        //     bcd: {
        //         'default': 'bcdUserAsset'
        //     },
        //     bos: {
        //         'default': 'bosInstance'
        //     },
        //     rds: {
        //         'default': 'rdsInstance'
        //     },
        //     bae: {
        //         'default': 'baeInstance'
        //     },
        //     baepro: {
        //         'default': 'baeproInstance'
        //     },
        //     vod: {
        //         'default': 'vodInstance'
        //     },
        //     lss: {
        //         'default': 'lssInstance'
        //     },
        //     bcm: {
        //         'default': 'bcmConsole'
        //     }
        // };

        // // 总览页跳转到移动端 dashboard
        // var overviewHash = ['/index/overview', '/index/overview_v3', '/aip/overview'];
        // var mobileUrl = '';
        // if (location.pathname === '/' || overviewHash.indexOf(location.hash) !== -1) {
        //     mobileUrl = url + finishedModules.home.default;
        //     return location.replace(mobileUrl);
        // }

        // // 其它产品页则根据配置的映射关系跳转
        // var regResult = /\/(.*)\//g.exec(location.pathname) || [];
        // var currentModule = regResult[1];
        // if (finishedModules.hasOwnProperty(currentModule)) {
        //     var currentModulePath = finishedModules[currentModule];
        //     // PC 端的模块路径
        //     var targetPath = location.hash.slice(1);
        //     // 在移动端对应的路径
        //     var mobileRelativePath = currentModulePath[targetPath];

        //     // 如果移动端有对应的页面就跳转到对应的页面
        //     if (mobileRelativePath) {
        //         mobileUrl =  url + mobileRelativePath;
        //     }
        //     // 如果没有对应的页面，但是配置了该产品的 default 页面，就跳转到 default 页面
        //     else if (currentModulePath.default) {
        //         mobileUrl = url + currentModulePath.default;
        //     }
        //     // 没有对应的页面，产品也没有配置default，则直接访问 PC 版本
        //     else {
        //         return false;
        //     }

        //     return location.replace(mobileUrl);
        // }

        // 不是移动端的产品则不处理
        return false;
    };

    /**
     * 判断当前用户是否是子用户
     *
     * @param {string} cookieString document.cookie
     * @return {boolean} 是否是子用户
     */
    var isSubuser = function (cookieString) {
        var cookieArr = (document.cookie || cookieString).split(';');
        var cookie = {};
        for (var i = 0; i < cookieArr.length; i++) {
            // fixme: "BAIDUID=29AE489074DB0FF5E269D268D2E0EC59:FG=1"
            var temp = cookieArr[i].split('=');
            cookie[temp[0].trim()] = temp[1];
        }

        var mainAccountId = cookie['bce-login-accountid'];
        var subAccountId = cookie['bce-login-userid'];
        if (mainAccountId && subAccountId) {
            return !(mainAccountId === subAccountId);
        }
        // 子账户id不存在，则不为子用户
        return false;
    };

    // pageMaker的load逻辑由saas侧的layout控制，这里不做控制
    var devLoadjsScript = '<script type="text/javascript" src="https://bce.bdstatic.com/console/fe-framework/loadjs.dev.js"></script>';
    // 如果是沙盒环境，loadjs.js 换成 loadjs.dev.js
    if (/bcetest/.test(location.host)) {
        document.write(devLoadjsScript);
        return;
    }

    // 如果是联调环境，loadjs.js 换成 loadjs.dev.js
    if (/console-debug/.test(location.host)) {
        document.write(devLoadjsScript);
        return;
    }

    if (G_CDN_ENDPOINT === undefined || !G_CDN_ENDPOINT) {
        var G_CDN_ENDPOINT = 'https://bce.bdstatic.com';
    }

    if (!window.G_CONSOLE_ENDPOINT) {
        window.G_CONSOLE_ENDPOINT = '';
    }

    // TODO: 合入 master 之后此处需要统一
    var FW_PATH_PREFIX = G_CDN_ENDPOINT + `/console/fe-framework/bd54d68`;

    // 判断活动来源 和 强制不跳转
    var cookies = document.cookie.split(';');
    var referrer = ''
    // document.referrer可能存在%，导致decodeURIComponent报错
    try {
        referrer = decodeURIComponent(document.referrer);
    }
    catch(e) {
        // 处理一下异常
    }
    var reg = new RegExp('(BCE_APP_IGNORE_FORCE=|")', 'g');
    var ignoreForce = true;

    for (var j = 0; j < cookies.length; j++) {
        if (cookies[j].indexOf('BCE_APP_IGNORE_FORCE') >= 0) {
            // 判断用户是否设置强制PC
            ignoreForce = cookies[j].replace(reg, '').trim() !== 'FALSE';
        }
    }

    function getQueryString(name) {
        var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
        var res = window.location.search.substr(1).match(reg);
        if (res) {
            return decodeURIComponent(res[2]);
        };
        return null;
     }

    // 移动端跳转PC页面标示参数，不走移动端模块跳转判断逻辑
    var ignoreApp = getQueryString('ignore-app') === 'true';

    // 跳转移动端对应模块
    if (referrer.indexOf('.baidu.com/campaign/') < 0
        && ignoreForce
        && screen.width <= 768
        && isSubuser() === false
        && ignoreApp === false) {
        // 以前未登录跳转会在第一个文档请求处理，现在没有在该请求处理，导致我们的代码与预期运行不一致
        judgeMoudle();
    }

    function loadCss(url) {
        var link = document.createElement('link');
        link.setAttribute('rel', 'stylesheet');
        link.setAttribute('href', url);

        var head = document.getElementsByTagName('head')[0] || document.body;
        head.insertBefore(link, document.head.getElementsByTagName('link')[0]);
    }

    loadCss(FW_PATH_PREFIX + '/main.css');
    loadCss(G_CDN_ENDPOINT + '/iconfont/iconfont.css');

    if (window.esl || window.requirejs) {
        require.config({
            paths: {
                framework: FW_PATH_PREFIX + '/bundle'
            }
        });
    }
    else {
        var src = FW_PATH_PREFIX + '/bundle.js';
        if (isPagemaker) {
            loadScript(src);
            // 适配pagemaker加载framework流程，先加载loadjs，在bundlejs加载完成后通知pagemaker启动framework
            var cb = function() {
                var bundleEvent = new Event('bundleLoaded');
                // dispatch bundleLoad事件
                if(document.dispatchEvent) {  
                    document.dispatchEvent(bundleEvent);
                } else {
                    document.fireEvent(bundleEvent);
                }
                bundleScript.removeEventListener('load', cb);
            }
            bundleScript.addEventListener('load', cb);
        } else {
            document.write(`<script type="text/javascript" src="${src}"></script>`);
        }
    }
})();
