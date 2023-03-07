//./pages/api/v1/newsline/update.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { updateUserNewsline } from "../../../../lib/db/newsline"
import { dbEnd } from "../../../../lib/db"
import fetchNewsline from '../../../../lib/fetchNewsline';
import { updateSession } from "../../../../lib/db/user";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    await NextCors(req, res, {
        // Options
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
        origin: '*',
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    const body = req.body;
    let { sessionid, userslug, newsline, switch: switchParam, tag }: { sessionid?: string, userslug?: string, newsline: string, switch: 'on' | 'off', tag: string } = body;

    const id = userslug || sessionid;
    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});

    if (!redis)
        return res.status(500).json({ msg: "Unable to create redis" })
    if (!id)
        return res.status(200).json({ success: false, msg: "userslug or sessionid is missing" })
    try {
        const userNewslineKey = `user-definition-newsline-${newsline}-${id}`;
        if (!userslug && sessionid) {
            await updateSession({ threadid, sessionid });
        }
        await updateUserNewsline({ type: userslug ? 'user' : 'session', sessionid, userslug, newsline, threadid, key: `${newsline}-${id}`, tag, switchParam })
        await redis.del(userNewslineKey);  //next fetch would repopulate redis from db.   
        const newslineKey = `newsline-${newsline}-${id}`;
        await redis.del(newslineKey);
        redis.get(userNewslineKey);
        const myNewsline = await fetchNewsline({ redis, threadid, sessionid, userslug, newsline, update: 0 })
        return res.status(200).json({
            success: true,
            newsline: myNewsline
        })
    }
    catch (x) {
        l(chalk.red.bold("Exception in ipdate", x));
        return res.status(500).json({})
    }
    finally {
        dbEnd(threadid);
        await redis.quit();
    }
}
