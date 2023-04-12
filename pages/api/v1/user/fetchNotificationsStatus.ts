//./pages/api/v1/user/accept.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { getSessionSubscriptionOptions } from "../../../../lib/db/user"
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

    let {  sessionid} = req.query; // for testing;
    if(!sessionid){
        const body = req.body;
        sessionid=body.sessionid;
    }
    let threadid = Math.floor(Math.random() * 100000000)
    try {    
        const result=await getSessionSubscriptionOptions({ threadid, sessionid: sessionid as string || '' });
        res.status(200).json({success:true,status:result})
    }
    catch (x) {
        l(chalk.red.bold(x));
        res.status(501).json({ success: false })
    }
    finally {
        dbEnd(threadid);
    }
}
