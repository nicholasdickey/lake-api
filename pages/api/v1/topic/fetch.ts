//./pages/api/v1/topic/fetch.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis";
import { dbLog, dbEnd } from "../../../../lib/db";
import { getQwiket } from "../../../../lib/db/qwiket";
import { processBody } from "../../../../lib/process-body";
import { Qwiket } from "../../../../lib/types/qwiket";
import { verifyAck } from "../../../../lib/db/user"
interface Query {
    slug?: string,
    withBody: [0, 1],
    userslug?: string,
    sessionid: string,
    tag?: string,
    ack?: number
}
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<any>
) {
    await NextCors(req, res, {
        // Options
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        origin: '*',
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    let { slug = '', withBody, userslug, sessionid, tag, ack }: Query = req.query as unknown as Query;
    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
    if (!redis)
        return res.status(500).json({ msg: "Unable to connect to redis" });
    try {
        let json: any;
        let txid: string = '';
        try {
            if (slug != '') {
                const key = `txid-${slug}`;
                txid = await redis.get(key) || '';
                l('txid:',key,txid)
            }
            else {
                //home mode, the latest topic from feed
                const keyTxid = `tids-cat-published-${tag}`;
                const range = await redis.zrevrange(keyTxid, 0, 0);
                txid = range[0];
            }
        }
        catch (x) {
            l(chalk.red.bold(x))
        }
        const key = txid?`ntjson-${withBody + '-'}${txid}`:'';
       /* if(key){
            const jsonRaw = await redis.get(key);
            if (jsonRaw){
                json = JSON.parse(jsonRaw)
                l("JSON:",chalk.cyan(js(json)),chalk.magenta(jsonRaw))
            }
        }*/
        if (!json) {
            // get from db
           // l("calling getQwiket",slug,withBody,tag)
            json = await getQwiket({ threadid, slug, withBody, tag })
        
            if (json && withBody) {
                //l("json1:", js(json.body))
                const b= processBody(json);
              //  l("json11:", js(json.body),b)
               if(b&&b.length>0)
                json.body=b;
                else {
                    json.body=json.body.blocks;
                    json.url=`https://am1.news/usconservative/topic/fq/${slug}`
                }
               // l("json2:", js(json.body))
                //const key = `ntjson-${withBody + '-'}${txid}`;
                const jsonRaw = JSON.stringify(json);
                try {
                    if(key)
                    await redis.setex(key, 7 * 24 * 3600, jsonRaw);
                }
                catch (x) {
                    l(chalk.red.bold(x))
                }
            }
        }
        const item = json;
        if (!item) {
            return res.status(200).json({ success: false, msg: "Topic doesn't exist" });
        }
        let common: Qwiket = {
            catName: item.catName,
            catIcon: item.catIcon,
            postBody: '',
            qpostid: 0,
            published_time: item.published_time,
            shared_time: item.shared_time,
            slug: item.threadid,
            title: item.title,
            site_name: item.site_name,
            url: item.url,
            description: item.description,
            author: item.author,
            image: item.image,
            tag: item.cat,
            body: item.body,
            headless: item.headless
        }
        /**
         * Check the user acceptances
         */
        if (item.body) {
            const ackKey = `ack-${userslug || sessionid}-${tag}`;
            let hasAck = ack || await redis.get(ackKey);
            if (!hasAck) {
                const ackAllKey = `ack-${userslug || sessionid}-all`;
                hasAck = await redis.get(ackAllKey);
                if (!hasAck) {
                    hasAck = (await verifyAck({ threadid, userslug, sessionid, tag: tag || '' })) ? "1" : null;
                    if (hasAck) {
                        //TMP  await redis.setex(ackKey, 24 * 3600, "1")
                    }
                }
            }
            if (!hasAck) {
               // common.body = '';
                common.hasBody = true;
                common.ack = false;
            }
            else {
                common.ack = true;
                common.hasBody = true;
            }
        }
        return res.status(200).json({ success: true, item: common });
    }
    catch (x) {
        l(chalk.red.bold(x));
        res.status(501).json(x);
    }
    finally {
        await redis?.quit();
        dbEnd(threadid);
    }
}
