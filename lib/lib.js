const isBot = require('isbot-fast');
const chalk = require('chalk');
chalk.enabled = true;
const l = console.log;
const microtime = () => (new Date).getTime() | 0
const apiUrl = 'http://' + process.env.QWIKETAPI + ':' + process.env.QWIKETAPIPORT;
function logTime({ t1, threadid, name }) {

    const t2 = microtime(true);
    l(chalk.green(`QAPI RETURN ${name}(${threadid}):${(t2 - t1)} ms`));
}
function logEnter(name, url) {
    const threadid = Math.floor(Math.random() * 10000);
    const t1 = microtime(true);
    l(chalk.blue(`QAPI ENTER ${name}(${threadid})`), { url });
    return { threadid, t1, name };

}
function ssrParams(req) {
    if (!req)
        return false;
    const cookies = req.cookies;

    let identity = cookies['identity'];
    if (!identity) {
        identity = cookies['qid'] || '';
    }
    let anon_identity = cookies['anon'] || '';
    var xFF = req.headers['x-forwarded-for'];
    var ua = encodeURIComponent(req.headers['user-agent'] || '');
    var ip = xFF ? xFF.split(',')[0] : req.connection.remoteAddress || '';
    //console.log("IP: ", { ip, xFF, rip: req.connection.remoteAddress, identity, hostname: req.hostname, reqip: req.ip })
    var w = ip.split(':');
    ip = w ? w[w.length - 1] : ip;
    let ssrParams = {};
    ssrParams.host = req.headers.host;
    ssrParams.xip = ip;
    ssrParams.ua = encodeURIComponent(ua);
    ssrParams.pxid = identity;

    ssrParams.anon = anon_identity;
    console.log("ssrParams:", { ssrParams })
    return ssrParams;
}
function proxyParams({ req, url }) {
    let { host, xip, ua, pxid, anon } = req.query;
    console.log('aaaaa', req.query)
    if (!host || !xip || !ua) {
        let ssr = ssrParams(req);
        if (!host)
            host = ssr.host;
        if (!xip)
            xip = ssr.xip;
        if (!pxid)
            pxid = ssr.pxid;
        if (!anon)
            anon = ssr.anon;
    }
    let bot = isBot(ua);
    let fb = ua && ua.indexOf('facebook') >= 0;
    url = `${url}&host=${host}&xip=${xip}&XDEBUG_SESSION_START=vscode`;
    if (fb)
        url = `${url}&fb=1`;
    if (bot)
        url = `${url}&bot=1`;
    if (anon)
        url = `${url}&anon=${anon}`;
    if (pxid)
        url = `${url}&pxid=${pxid}`;
    console.log(chalk.red.bold("PROXY PARAMS", url, pxid))
    return url;
}
module.exports = { l, chalk, microtime, apiUrl, logTime, logEnter, proxyParams }
