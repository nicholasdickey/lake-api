import processFeed from '../functions/process-feed-channels';
import { exit } from "process"
import { l, chalk, allowLog, sleep, js } from "../common.js"

let threadid = Math.floor(Math.random() * 100000000);
let feed=process.env.FEED||"";
let rss=process.env.RSS||"";
allowLog();
async function runFeed() {
    l(
        "inside processFeed:",
      
    )
   
    await processFeed(feed,rss,threadid);
    await sleep(process.env.SLEEP_INTERVAL?+process.env.SLEEP_INTERVAL:1000)
    exit();
}
runFeed();
