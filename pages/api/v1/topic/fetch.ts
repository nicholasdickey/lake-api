
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis";
import { dbLog, dbEnd } from "../../../../lib/db";
import { getQwiket } from "../../../../lib/db/qwiket";
import { processBody } from "../../../../lib/processBody";
import { Qwiket } from "../../../../lib/types/qwiket";

type Data = any

interface Query {
    slug?: string,
    withBody: [0, 1],
    userslug: string,
    tag?: string
}
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    await NextCors(req, res, {
        // Options
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        origin: '*',
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    const { slug, withBody, userslug, tag }: Query = req.query as unknown as Query;
    l(chalk.green.bold("FETCH TOPIC",js({slug, withBody, userslug, tag })))
    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
    if (!redis)
        return res.status(500).json({ msg: "Unable to connect to redis" });

    try {
        let json: any;
        let txid: string='';
        if (!slug) {
            //home mode, the latest topic from feed
            const keyTxid = `tids-cat-published-${tag}`;
            const range = await redis.zrevrange(keyTxid, 0, 0);
            txid = range[0];
            l(chalk.yellow.bold("NO SLUG",js({keyTxid,range,txid})))
           
        }
        else {
            const key = `txid-${slug}`;
            txid = await redis.get(key) || '';
        }
        // l(chalk.yellow.bold("tttxid:",txid))

        if (txid) {
            const key = `ntjson-${withBody + '-'}${txid}`;
            // l(chalk.green.bold("GET Qwiket from CACHE", key));
            const jsonRaw = await redis.get(key);
            // l(chalk.green.bold("RESULT:"), jsonRaw)
            if (jsonRaw)
                json = JSON.parse(jsonRaw);
        }
        if (!json) {
            // get from db
            // l(chalk.green.bold("GET Qwiket from DB"));
            json = await getQwiket({ threadid, slug, withBody,tag })
            if (withBody) {
                // l('withBody',json)
                json.body = processBody(json);
                const key = `ntjson-${withBody + '-'}${txid}`;
                const jsonRaw = JSON.stringify(json);
                // console.log("kkkey:",key,jsonRaw)
                await redis.setex(key, 7 * 24 * 3600, jsonRaw);
                // l(76548)
                // l(chalk.cyan.bold("withBody after processed",js({withBody,key,json})))
            }
        }
        const item = json;
        console.log(js(item))
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
            body: item.body
        }
        /**
         * Check the user acceptances
         */
        if (userslug) {

        }
        //  l(chalk.yellow(js(common)))
        res.status(200).json({ success: true, item: common });

    }

    catch (x) {
        l(chalk.red.bold(x));
        res.status(501).json(x);
    }
    finally {
        redis?.quit();
        dbEnd(threadid);
    }

}
