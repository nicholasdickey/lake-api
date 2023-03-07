//./pages/api/v1/user/onlineCount.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"

const onlineCount = async (identity: string, redis: any) => {
    if (identity) {
        if (Array.isArray(identity)) identity = identity[0];
        var d = new Date();
        var q =
            "user-count-" +
            d.getDate() +
            (d.getMonth() + 1) +
            d.getFullYear();
        var mq = "user-count-" + (d.getMonth() + 1) + d.getFullYear();
        let sq = await redis.zscore(q, identity);
        if (!sq) {
            redis.zadd(q, (Date.now() / 1000) | 0, identity);
        }
        sq = await redis.zscore(mq, identity);
        if (!sq) {
            redis.zadd(mq, (Date.now() / 1000) | 0, identity);
        }
        redis.expire(q, 365 * 24 * 3600);
        redis.zadd("online", (Date.now() / 1000) | 0, identity);
        redis.expire("online", 365 * 24 * 3600);

        await redis.zremrangebyscore(
            "online",
            0,
            ((Date.now() / 1000) | 0) - 1800
        );
        let count = await redis.zcount("online", "-inf", "+inf");
        let dayCount = await redis.zcount(q, "-inf", "+inf");
        return {
            success: true,
            count,
            daycount: dayCount
        };
    } else {
        return { "success": false };
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<any>
) {
    await NextCors(req, res, {
        // Options
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
        origin: '*',
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });
    let { userslug, sessionid } = req.query;
    const id = userslug || sessionid || '';
    const redis = await getRedisClient({});
    if (!redis) {
        return res.status(500).json({ msg: "Unable to create redis" })
    }

    try {
        const ret = await onlineCount(id as string || '', redis);
        return res.status(200).json(ret);
    }
    catch (x) {
        l(chalk.red.bold(x));
        res.status(501).json({ success: false })
    }
    finally {
        await redis.quit();
    }
}
