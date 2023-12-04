import rule from './rules/index.js';

import axios from 'axios';

import UserAgent from "user-agents"
import cloudscraper from "cloudscraper"
import { l, chalk, microtime, js, ds,uxToMySql,allowLog, sleep } from "../common.js";

function doRequest(url) {
    l(chalk.greenBright("doRequest",url));
    return new Promise(function (resolve, reject) {
        var options = {
            uri: url,
            // jar: requestModule.jar(), // Custom cookie jar
            headers: {
                // User agent, Cache Control and Accept headers are required
                // User agent is populated by a random UA.
                'User-Agent': 'Ubuntu Chromium/34.0.1847.116 Chrome/34.0.1847.116 Safari/537.36',
                'Cache-Control': 'private',
                'Accept': 'application/xml,application/xhtml+xml,text/html;q=0.9, text/plain;q=0.8,image/png,*/*;q=0.5'
            },
            // Cloudscraper automatically parses out timeout required by Cloudflare.
            // Override cloudflareTimeout to adjust it.
            cloudflareTimeout: 15000,
            // Reduce Cloudflare's timeout to cloudflareMaxTimeout if it is excessive
            cloudflareMaxTimeout: 30000,
            // followAllRedirects - follow non-GET HTTP 3xx responses as redirects
            followAllRedirects: true,
            // Support only this max challenges in row. If CF returns more, throw an error
            challengesToSolve: 3,
            // Remove Cloudflare's email protection, replace encoded email with decoded versions
            decodeEmails: false,
            // Support gzip encoded responses (Should be enabled unless using custom headers)
            gzip: true,
            // Removes a few problematic TLSv1.0 ciphers to avoid CAPTCHA
            agentOptions: { ciphers: 'ECDHE-ECDSA-AES128-GCM-SHA256' }
        };
        return cloudscraper(options, function (error, res, body) {
            l("then",error/*,res.statusCode*/)
            if (!error && res.statusCode == 200) {
                return resolve(body);
            } else {
                return reject(error);
            }
        });
    });
}
const getAndParse = async (url) => {
    let body;
    let response;
    const userAgent = new UserAgent()
    const ua = userAgent.toString()
    allowLog();
    try {
        /* response = await fetch(pageUrl, {
              // agent: notorAgent,
              headers: { "User-Agent": ua },
          })*/
        //l(chalk.yellow("Before doRequest NO TORR", pageUrl));
        l(chalk.yellow("Before doRequest", url))
        try{
            response = await doRequest(url);
            await sleep(5000);
        }
        catch(x){
            l(chalk.red("doRequest error",x))
        }
        l(chalk.green("After doRequest NO TORR", url))
        if(!response){
            const apikey = process.env.SCRAPE_API_KEY;;
            l(chalk.yellow.bold("PREMIUM SCRAPE", url,apikey));
            await sleep(10000);
            response = await axios(`https://api.zenrows.com/v1/`, {
                // agent: notorAgent,
                headers: { "User-Agent": ua },
                params: {
                    'url': url,
                    'apikey': apikey,
                  //  'antibot': 'true',
                },
            })
            l(chalk.yellowBright("AFTER PREMIUM SCRAPE", url))
            await sleep(5000);
            l('after sleep 2')
            body = response.data;
        }
        else {
            body=response;
        }
    }
    catch (x) {
        l(chalk.red.bold(x))
        return { body: null, title: null }
    }
    // l(chalk.blue.bold("cloudscraper response",response))
   // body = response;
   // const { data } = await axios.get(url);
   // const $ = cheerio.load(body);
   //l("calling rule",body)
    const result = await rule(body,url);
    l(chalk.green("After rule", js(result)));
    return result;
}
export default getAndParse;