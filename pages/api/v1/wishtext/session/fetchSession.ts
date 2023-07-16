//./pages/api/v1/user/fetchSession.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../../lib/common";
import { getRedisClient } from "../../../../../lib/redis"
import { fetchSession } from "../../../../../lib/db/wishtext"
import { dbEnd } from "../../../../../lib/db"

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

    let { sessionid } = req.query;
    let threadid = Math.floor(Math.random() * 100000000)
   
    if (!sessionid)
        return res.status(200).json({ user: {} })

    try {   
        const session =  await fetchSession({ threadid, sessionid: sessionid as string });
       // console.log("fetchSession", session)    
        if(!session){
            return res.status(200).json({ success: true, session:null })  
        }
        return res.status(200).json({ success: true, session:JSON.parse(session) })
    }
    catch (x) {
        l(chalk.red.bold(x));
        res.status(500).json({ success: false })
    }
    finally {

        dbEnd(threadid);
    }
}
