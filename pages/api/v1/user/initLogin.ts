//./pages/api/v1/user/initLogin.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { getUserSession, saveUserSession } from "../../../../lib/db/user"
import { dbEnd } from "../../../../lib/db"

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
    const body = req.body;
    let { userslug, options } = body;
    let threadid = Math.floor(Math.random() * 100000000);
    const redis = await getRedisClient({});
    if (!redis) {
        return res.status(500).json({ msg: "Unable to create redis" })
    }
    if (!userslug)
        return res.status(200).json({ user: {} })
    try {
        const userKey = `user-options-${userslug}`;
        let userSession = await redis.get(userKey);
        if (!userSession) {
            userSession = await getUserSession({ threadid, userslug: userslug as string });
            if (!userSession) {
                userSession = JSON.stringify(options);
                await saveUserSession({ threadid, userslug: userslug as string, options: userSession });
            }
            redis.setex(userKey, 365 * 24 * 3600, userSession);
        }
        else {
            redis.expire(userKey, 365 * 24 * 3600);
        }
        if (!userSession)
            return res.status(501).json({ msg: "Unable to parse user" });
        return res.status(200).json({ success: true, userSession })
    }
    catch (x) {
        l(chalk.red.bold(x));
        res.status(500).json({ success: false })
    }
    finally {
        await redis.quit();
        dbEnd(threadid);
    }
}
