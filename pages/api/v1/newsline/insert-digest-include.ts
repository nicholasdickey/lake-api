//./pages/api/v1/newsline/insert-digest-include.ts
import type { NextApiRequest, NextApiResponse } from 'next'

import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { dbLog, dbEnd } from "../../../../lib/db"
import {insertDigestInclude} from "../../../../lib/db/digest"
interface Query {
    slug?: string,
    tag?: string,
   }
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

    const body = req.body; const { slug, tag }: Query = req.query as unknown as Query;
   
    let threadid = Math.floor(Math.random() * 100000000)
    try {
        l(chalk.green.bold("insertDigestInclude", slug, tag));
         await insertDigestInclude({  threadid,slug:slug ||"",tag:tag||"" });
      
        return res.status(200).json({
            success: true,
        })
    }
    catch (x) {
        l(chalk.red.bold("Exception in insert-digest-include", x));
        return res.status(500).json({})
    }
    finally {
        dbEnd(threadid);
    }

}
