//./pages/api/v1/user/updateSession.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../../lib/common";
import { getRedisClient } from "../../../../../lib/redis"
import {  updateSession } from "../../../../../lib/db/wishtext"
import {  dbEnd } from "../../../../../lib/db"

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
    let { sessionid, config } =body;
   // console.log("update session",sessionid,config)
    let threadid = Math.floor(Math.random() * 100000000)
    try{
        await updateSession({ threadid, sessionid: sessionid as string, config: JSON.stringify(config) as string });
        return res.status(200).json({ success: true})
    }
    catch (x) {
        l(chalk.red.bold(x));
        res.status(500).json({ success: false })
    }
    finally {      
        dbEnd(threadid);
    }
}
