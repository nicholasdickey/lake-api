
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis";
import { dbLog, dbEnd } from "../../../../lib/db";
import { getQwiket } from "../../../../lib/db/qwiket";
import { processBody } from "../../../../lib/processBody";
import {Qwiket} from "../../../../lib/types/qwiket";
type Data = any

interface Query {
    slug: string,
    withBody: [0, 1]
}
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    await NextCors(req, res, {
        // Options
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
        origin: '*',
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    const { slug, withBody }: Query = req.query as unknown as Query;
    // l(chalk.blue("layoutNumber",layoutNumber))
    let userConfigKey = null;
    let userLayout = null;
    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
    if (!redis)
        return res.status(500).json({ msg: "Unable to connect to redis" });

    try {
        const key = `txid-${slug}`;
        const txid = await redis.get(key);
        let json: any;
        if (txid) {
            const key = `ntjson-${withBody + '-'}${txid}`;
            //  l(chalk.green.bold("GET Qwiket from CACHE", key));
            const jsonRaw = await redis.get(key);
            // l(chalk.green.bold("RESULT:"), jsonRaw)
            if (jsonRaw)
                json = JSON.parse(jsonRaw);
        }
        if (!json) {
            // get from db
            // l(chalk.green.bold("GET Qwiket from DB"));
            json = await getQwiket({ threadid, slug, withBody })
            if (withBody) {
               // l('withBody',json)
                json.body = processBody(json);
               // l(chalk.cyan.bold("withBody after processed",js(json)))
            }
        }
        const item=json;
        let common:Qwiket={
            catName: item.catName,
            catIcon: item.catIcon,
            postBody:'',
            qpostid:0,
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
            body:item.body
        }
      //  l(chalk.yellow(js(common)))
        res.status(200).json({ success: true, item: common });

    }

    catch (x) {
        l(chalk.red.bold(x));
        res.status(501).json(x);
    }
    finally{
        redis?.quit();
        dbEnd(threadid);
    }

}
