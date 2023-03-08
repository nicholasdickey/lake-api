//./pages/api/v1/newsline/fetchAll.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { dbEnd } from "../../../../lib/db"
import fetchAll from "../../../../lib/fetch-all"

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

    let { sessionid, userslug, newsline, filters, q }: { sessionid?: string, userslug?: string, newsline: string, filters: string[], q?: string } = body;
    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
   
    if (!redis)
        return res.status(500).json({ msg: "Unable to create redis" })
    try {
        const allPublications = await fetchAll({ redis, threadid, sessionid, userslug, newsline, filters, q })
        return res.status(200).json({
            success: true,
            publications: allPublications,
        })
    }
    catch (x) {
        l(chalk.red.bold("Exception in fetchExplore", x));
        return res.status(500).json({})
    }
    finally {
        dbEnd(threadid);
        redis.quit();
    }
}
