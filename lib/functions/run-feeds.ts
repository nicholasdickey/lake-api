import { l, chalk, microtime, js, ds, uxToMySql, allowLog } from "../common.js";
import addArticle from "./add-article";
import { getChannelItem, checkFeedItem, getChannels, saveChannelItem, getFeeds } from "./dbservice";
import getAndParse from "./get-and-parse.js";
import Parser from "rss-parser"
import createDigest from './digest';
import processFeed from './process-feed-channels';
import { dbEnd } from "../db"
import { getRedisClient } from "../redis"
interface Filter {
    value: string,
    sign: number,
}
allowLog();
const runFeeds = async (threadid: number,force:number) => {
    const redis = await getRedisClient({});
   
    if (!redis){
        l(chalk.red("Unable to create redis"));
        return false;
    }
        
    try {
        const feeds = await getFeeds({ threadid,force});
        l("feeds=", feeds);
        for (let i = 0; i < feeds.length; i++) {
            const feed = feeds[i];
            await processFeed(feed.feed, feed.rss, threadid,redis);
        }
    }
    finally {
        dbEnd(threadid);
        redis.quit();
    }
}
export default runFeeds;