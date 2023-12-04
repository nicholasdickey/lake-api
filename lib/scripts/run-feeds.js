import runFeeds from '../functions/run-feeds';
import { exit } from "process"
import { l, chalk, allowLog, sleep, js } from "../common.js"

let threadid = Math.floor(Math.random() * 100000000);
let feed=process.env.FEED||"";
let rss=process.env.RSS||"";
let force=process.env.FORCE||"";
allowLog();
async function runFeed() {
    l(
        "inside processFeed:",
      
    )
   
    await runFeeds(threadid,force);
    await sleep(process.env.SLEEP_INTERVAL?+process.env.SLEEP_INTERVAL:1000)
    exit();
}
runFeed();
