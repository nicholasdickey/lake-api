//./pages/api/v1/newsline/fetch.ts
import type { NextApiRequest, NextApiResponse } from 'next'

import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { dbLog, dbEnd } from "../../../../lib/db"
import fetchNewsline from "../../../../lib/fetch-newsline"

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

    let body = req.body;
    if (!body || !body.newsline)
        body = req.query;
    let { sessionid, userslug, newsline, update }: { sessionid?: string, userslug?: string, newsline: string, update?: number } = body;

    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});

    if (!redis)
        return res.status(500).json({ msg: "Unable to create redis" });
    try {
        const defaultOverlayNewslineDefinition = await fetchNewsline({ redis, threadid, sessionid, userslug, newsline, update });
      
        return res.status(200).json({
            success: true,
            newsline: defaultOverlayNewslineDefinition
        })
    }
    catch (x) {
        l(chalk.red.bold("Exception in fetchExplore", x));
        return res.status(500).json({})
    }
    finally {
        dbEnd(threadid);
        await redis.quit();
    }

}
