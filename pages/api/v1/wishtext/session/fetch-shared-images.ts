//./pages/api/v1/user/fetchSession.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../../lib/common";
import { getRedisClient } from "../../../../../lib/redis"
import { fetchSharedImages } from "../../../../../lib/db/wishtext"
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

    const tags:string = req.query.tags as string||"";
    l(chalk.yellowBright("fetchSharedImages API>",tags));

    let threadid = Math.floor(Math.random() * 100000000)
   
    //if (!sessionid)
    //    return res.status(200).json({ user: {} })

    try {   
        const images =  await fetchSharedImages({ threadid,tags });
      //  console.log("fetchSharedImages", tags,images)    
        if(!images){
            return res.status(200).json({ success: true, images:null })  
        }
        return res.status(200).json({ success: true, images:images.map((i:string)=>{l(chalk.cyanBright(i));l(chalk.magentaBright(JSON.parse(i)));return JSON.parse(i)}) })
    }
    catch (x) {
        l(chalk.red.bold(x));
        res.status(500).json({ success: false })
    }
    finally {

        dbEnd(threadid);
    }
}
