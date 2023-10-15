//./pages/api/v1/newsline/fetch.ts
import type { NextApiRequest, NextApiResponse } from 'next'

import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { dbLog, dbEnd } from "../../../../lib/db"
import {getUnprocessedDigestInclude} from "../../../../lib/db/digest"

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

  
    let threadid = Math.floor(Math.random() * 100000000)
    try {
        const digestInclude = await getUnprocessedDigestInclude({  threadid, });
      
        return res.status(200).json({
            success: true,
            items:digestInclude
        })
    }
    catch (x) {
        l(chalk.red.bold("Exception in fetchExplore", x));
        return res.status(500).json({})
    }
    finally {
        dbEnd(threadid);
    }

}
