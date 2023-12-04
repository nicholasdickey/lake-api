import { l, chalk, microtime, js, ds, uxToMySql, allowLog } from "../common.js";
import addArticle from "./add-article";

import { getChannelItem, checkFeedItem, getChannels, saveChannelItem,setProcessedFeed } from "./dbservice";
import getAndParse from "./get-and-parse.js";
import Parser from "rss-parser"
import createDigest from './digest';
interface Filter {
    value: string,
    sign: number,
}
allowLog();
const processFeed = async (feed: string, rss: string, threadid: number,redis:any) => {
    const notor = 1;
    const active = 1;
    const agent = "";
    l("rssFeed:", "notor=", notor, js({ notor, rss, active, feed }));
    if (active) {
        let parser = new Parser({
            timeout: 124000,
            //defaultRSS: 2.0,
            requestOptions: notor == 1 ? {} : {},
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36",
            },
        })
        // l(chalk.green("Parser", js(parser)))

        let rssFeed: any;
        try {
            l("RSS URL:", rss)
            if (rss.indexOf("http") < 0) rss = `http://${rss}`
            //  l(9999, rss)
            //   const lrss=await fetch(rss);
            //  const body=await lrss.text();
            //  l("ffff",body)

            rssFeed = await parser.parseURL(rss)
        } catch (x) {
            l(
                chalk.red(
                    "RSS PARSER EXCEPTION",
                    rssFeed,
                    rss,
                    x
                )
            )
        }

         l(chalk.blue("rss parsed", JSON.stringify(rssFeed)));
        //   process.exit();
        if (rssFeed) console.log(rssFeed.title)
        const items = rssFeed ? rssFeed.items : []
        /*    await dbLog({
                show: false,
                type: "RSS",
                body: JSON.stringify(items),
                threadid,
                sessionid,
                username,
            })*/
        for (var j = 0; j < items.length; j++) {
            l(chalk.blue("rss item", j));
            const item = items[j]
            if (feed == 'fnc')
                item.link = item.guid;
            //  l("rss item", js(item))

            if (!item.link) {
                if (item.guid) {
                    item.link = item.guid
                }
                else
                    continue;
            }
            l("item.link", item.link)
            if (item.link.indexOf("http") < 0) continue
            item.link = item.link.replace(
                "minx.cc",
                "acecomment.mu.nu"
            )
            const url = item.link;
            // check if existing item    
            const exists = await checkFeedItem({ threadid, feed, url });
            if (exists) {
                l(chalk.green("exists", js({ url })))
                continue;
            }
            //if(url!='https://www.americanthinker.com/articles/2023/12/thursdays_desantisnewsom_tv_debate_was_a_ratings_winner_for_fox_news.html')
             //   continue;
            l(chalk.red("new item", url))
            //check if exists in cache
            let article=JSON.parse(await redis.get(`$x40_feed_item_${url}`));
            if(!article){
                l("cache miss, getting from web");
                article = await getAndParse(url);
                if(article.body && article.body.length>0)
                    await redis.setex(`$x40_feed_item_${url}`,7*24*3600,JSON.stringify(article));
            }
            else {
                l(chalk.magentaBright("cache hit"));
            }
            let { body, title } = article;
            if (!body || body.length == 0) continue;
            if (!title || title.length == 0)
                title = "";
            //now go through all channels and apply filters
            let digest;
            l("getting channels for ",title)
            const channels = await getChannels({ threadid });
            l("channels", channels);
            for (let i = 0; i < channels.length; i++) {
                const { channel, filters } = channels[i];
                l("channel", channel, filters);
                let skip = false;
                let go=false;
                for (let i = 0; i < filters.length; i++) {
                    const { value, sign } = filters[i];
                    l(chalk.green("filter", js({ value, sign })))
                    if (sign == 1) {
                        l(
                            chalk.green(
                                "positive filter",
                                js({ value}))
                        )
                        if (body.toLowerCase().indexOf(value) >= 0 || title.toLowerCase().indexOf(value) >= 0) {
                           l(chalk.greenBright("FILTER MATCH",value))
                            go = true;
                            
                        }
                    }
                    else {
                        if (body.toLowerCase().indexOf(value) >= 0 || title.toLowerCase().indexOf(value) >= 0) {
                            skip = true;
                           
                        }
                    }
                }
                l("after filters",js({skip,go}))
              //  if(url=='https://www.americanthinker.com/articles/2023/12/thursdays_desantisnewsom_tv_debate_was_a_ratings_winner_for_fox_news.html')
              //  process.exit();
                if (skip||!go) {
                    l(chalk.bgYellow("skipping", js({ title, url })))
                    continue;
                }


                //check if item exists
                const existingItem = await getChannelItem({ threadid, url, channel });
                if (existingItem) {
                    const { digest: existDigest, body, createdTime } = existingItem;
                    l(chalk.bgGreen("existingItem", js({ existDigest, body, createdTime })))
                    if (body && body.length > 0 && !existDigest || existDigest.length == 0) {
                        const t = new Date(createdTime).getTime() / 1000;
                        const now = new Date().getTime() / 1000;
                        const diff = now - t;
                        if (diff > 60 * 5) {
                            l(chalk.bgRed("stuck digest", js({ url })))
                            if (!digest) {
                                digest = await createDigest(body);
                                if (!digest)
                                    continue; // will retry on the next run

                            }
                            await saveChannelItem({ ...existingItem, digest, url, channel, threadid });

                        }
                    }
                    continue;
                }
                else {
                    l(chalk.bgRed("new item", js({ url })))
                    if (!digest) {
                        digest = await createDigest(body);
                        if (!digest)
                            continue; // will retry on the next run

                    }
                    await saveChannelItem({ title, body, digest, url, channel, threadid });

                }
            }
        }
        await setProcessedFeed({ threadid, feed});
    }
}
export default processFeed