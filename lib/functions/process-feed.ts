import { l, chalk, microtime, js, ds, uxToMySql, allowLog } from "../common.js";
import addArticle from "./add-article";
import { getChannelItem } from "./dbservice";

import Parser from "rss-parser"
import digest from "./digest.js";
interface Filter {
    value: string,
    sign: number,
}
allowLog();
const processFeed = async (channel: string, feed: string, rss: string, filters: Filter[], threadid: number) => {
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

        //  l(chalk.blue("rss parsed", JSON.stringify(rssFeed)));
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
            const item = items[j];
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
            // l("item.link", item.link)
            if (item.link.indexOf("http") < 0) continue
            item.link = item.link.replace(
                "minx.cc",
                "acecomment.mu.nu"
            )
            const content = item.contentSnippet || item.content || item.description || item.summary || "";
            const title = item.title || "";
            const url = item.link || "";
            l(chalk.bgBlue("item", js({ title, url, content })))
            //run filters
            let skip=false;
            for(let i=0;i<filters.length;i++){
                const {value,sign}=filters[i];
                if(sign==1){
                    if(content.indexOf(value)<0&&title.indexOf(value)<0){
                        skip=true;
                        break;
                    }
                }
                else{
                    if(content.indexOf(value)>=0||title.indexOf(value)>=0){
                        skip=true;
                        break;
                    }
                }
            }
            if(skip){
                l(chalk.bgYellow("skipping", js({ title, url, content })))
                continue;
            }   


            //check if item exists
            const existingItem = await getChannelItem({ threadid, url, channel });
            if (existingItem) {
                const { dogest, body, createdTime } = existingItem;
                l(chalk.bgGreen("existingItem", js({ dogest, body, createdTime })))
                if (body && body.length > 0 && !digest || digest.length == 0) {

                    const t = new Date(createdTime).getTime() / 1000;
                    const now = new Date().getTime() / 1000;
                    const diff = now - t;
                    if (diff > 60 * 5) {
                        l(chalk.bgRed("stuck digest", js({ url })))
                        addArticle(url, channel, threadid);
                        continue;
                    }

                }
            }
            else {
                l(chalk.bgRed("new item", js({ url })))
                await addArticle(url, channel, threadid);
            }
        }
    }

}
export default processFeed