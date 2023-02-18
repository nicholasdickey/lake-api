

import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { updateUserAck, updateSessionAck } from "../../../../lib/db/user"
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
    l(chalk.yellow("fetch user"));
    let { userslug, sessionid, tag } = req.query;

    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
    if (!redis)
        return res.status(500).json({ msg: "Unable to create redis" })
    if (!userslug)
        return res.status(200).json({ user: {} })

    try {
        const ackKey = `ack-${userslug || sessionid}-${tag}`;
        if (userslug)
            await updateUserAck({ threadid, userslug: userslug as string || '', tag: tag as string || '' });
        else
            await updateSessionAck({ threadid, sessionid: sessionid as string || '', tag: tag as string || '' });
        //TMP await redis.setex(ackKey,24*3600,'1')    
        res.status(200).json({ success: true})
    }
    catch (x) {
        l(chalk.red.bold(x));
        res.status(501).json({ success: false })
    }
    finally {
        redis.quit();
        dbEnd(threadid);
    }
}
