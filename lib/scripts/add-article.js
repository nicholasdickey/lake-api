import addArticle from '../functions/add-article.js';
import { exit } from "process"
import { l, chalk, allowLog, sleep, js } from "../common.js"

let threadid = Math.floor(Math.random() * 100000000);
let url=process.env.URL||"";
let channel=process.env.CHANNEL||"";
async function runFeed() {
    l(
        "inside addArticle:",
      
    )
   
    await addArticle(url,channel,threadid);
    await sleep(process.env.SLEEP_INTERVAL?+process.env.SLEEP_INTERVAL:1000)
    exit();
}
runFeed();
