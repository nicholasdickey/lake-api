

import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { getSessionLayout, getUserLayout, getChannelConfig } from "../../../../lib/db/config"
import { dbLog, dbEnd } from "../../../../lib/db"
import { processLayout } from "../../../../lib/layout"
import {fetchQueue} from "../../../../lib/fetchQueue"
type Data = any

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

    let { newsline,forum,tag,userslug,sessionid,type,countonly, lastid,page,test } = req.query;

    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
    if (!redis)
        return res.status(500).json({msg:"Unable to create redis"})
   
    try {

        const ret=await fetchQueue({type,newsline,forum,tag,lastid,firstid:0,page,sessionid,countonly,userslug,test})
        l(chalk.magenta.bold(js(ret)))
        res.status(200).json(ret)
    }

    catch (x) {
        l(chalk.red.bold(x))
        redis.quit();
        dbEnd(threadid);
    }

}
