

import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { getSessionLayout, getUserLayout, getChannelConfig } from "../../../../lib/db/config"
import { dbLog, dbEnd } from "../../../../lib/db"
import { processLayout } from "../../../../lib/layout"
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

    let { id } = req.query;

    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
    if (!redis)
        return res.status(500).json({ msg: "Unable to create redis" })

    try {

        const ret = await onlineCount(redis,id)
        //  l(chalk.magenta.bold(js(ret)))
        res.status(200).json(ret)
    }

    catch (x) {
        l(chalk.red.bold(x));
        res.status(501).json(x);
    }
    finally {
        await redis.quit();
        dbEnd(threadid);
    }

}

const onlineCount = async (redis,identity)=> {


        if (identity) {
            if (Array.isArray(identity)) identity = identity[0];
            // console.log("onlineCount2=", count, identity)
            var d = new Date();
            var q =
                "user-count-" +
                d.getDate() +
                (d.getMonth() + 1) +
                d.getFullYear();
            var mq = "user-count-" + (d.getMonth() + 1) + d.getFullYear();
            // console.log('u-count:',q)
            let sq = await redis.zscore(q, identity);
            if (!sq) {
                redis.zadd(q, (Date.now() / 1000) | 0, identity);

                /*  let o = drsyncFormat(
                      "redis-zadd",
                      q + "||" + ((Date.now() / 1000) | 0),
                      identity,
                      365 * 24 * 3600
                  );
                  // console.log("%%% %%% %%% DRSYNC ", o);
                  redis.lpush("drsyncdb", o);*/
            }
            sq = await redis.zscore(mq, identity);
            if (!sq) {
                redis.zadd(mq, (Date.now() / 1000) | 0, identity);

                /* o = drsyncFormat(
                     "redis-zadd",
                     mq + "||" + ((Date.now() / 1000) | 0),
                     identity,
                     365 * 24 * 3600
                 );
                 //  console.log("%%% %%% %%% DRSYNC ",o);
                 redis.lpush("drsyncdb", o);*/
            }
            // redis.publish("drsyncdb", "update");
            redis.expire(q, 365 * 24 * 3600);
            //redis.zremrangebyscore(q,0,((Date.now()/1000)|0)-30*24*3600)
            redis.zadd("online", (Date.now() / 1000) | 0, identity);
            redis.expire("online", 365 * 24 * 3600);

            /* o = drsyncFormat(
                 "redis-zadd",
                 "online||" + ((Date.now() / 1000) | 0),
                 identity,
                 365 * 24 * 3600
             );
             //   console.log("%%% %%% %%% DRSYNC ",o);
             redis.lpush("drsyncdb", o);
             redis.publish("drsyncdb", "update");*/

            await redis.zremrangebyscore(
                "online",
                0,
                ((Date.now() / 1000) | 0) - 1800
            );
            let count = await redis.zcount("online", "-inf", "+inf");
            let dayCount = await redis.zcount(q, "-inf", "+inf");
            return {success:true,count,daycount:dayCount};
        } else {
            return ({success:false});
        }
    
}