

import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { getUserSession, saveUserSession } from "../../../../lib/db/user"
import { dbLog, dbEnd } from "../../../../lib/db"

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
    l(chalk.yellow("initLogin"))
    const body = req.body;
    let { userslug, options } =body;
    l(chalk.yellow("initLogin2"))
    let threadid = Math.floor(Math.random() * 100000000);
    l(chalk.yellow("initLogin21"))
    const redis = await getRedisClient({});
    l(chalk.yellow("initLogin33",userslug,options))
    if (!redis) {
        l(chalk.yellow("initLogin3"))
        return res.status(500).json({ msg: "Unable to create redis" })
    }
    if (!userslug)
        return res.status(200).json({ user: {} })

    try {
        l(chalk.yellow("initLogin4"))
        console.log("INIT LOGIN", userslug)
        const userKey = `user-options-${userslug}`;
        console.log("redis.get", userKey)
        let userSession = await redis.get(userKey);
        console.log("redis.get", userKey, userSession)
        if (!userSession) {
            l(chalk.red("USER FETCH NO user, calling db"))
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
        console.log("initLogin returning",userSession)
        res.status(200).json({ success: true, userSession })
    }

    catch (x) {
        l(chalk.red.bold(x));
        res.status(500).json({ success: false })

    }
    finally {
        redis.quit();
        dbEnd(threadid);
    }

}