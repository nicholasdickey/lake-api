// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { updateSessionNewsline, updateUserNewsline } from "../../../../lib/db/newsline"
import { dbLog, dbEnd } from "../../../../lib/db"


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST'&&req.method !== 'PATCH') {
        res.status(405).send({ message: 'Only POST and PATCH requests allowed' });
        return;
    }

    // console.log("inside fetchExplore handler",req.body)
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

        const userNewslineKey = `newsline-${newsline}-${id}`;

        if (userslug) {
            await updateUserNewsline({ threadid, key: `${newsline}-${userslug}`, tag, switchParam, userslug })

        }
        else if (sessionid) {
            await updateSessionNewsline({ threadid, key: `${newsline}-${sessionid}`, tag, switchParam, sessionid })
        }

        await redis.del(userNewslineKey);  //next fetch would repopulate redis from db.   

    }
    catch (x) {
        l(chalk.red.bold("Exception in fetchExplore", x));
        return res.status(500).json({})
    }

    res.status(200).json({})
}
