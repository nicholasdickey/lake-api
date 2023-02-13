// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { updateUserNewsline } from "../../../../lib/db/newsline"
import { dbLog, dbEnd } from "../../../../lib/db"
import fetchAll from '../../../../lib/fetchAll';

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

   

   // console.log("===*** &&& === inside newsline update all handler",req.body)
    const body = req.body;
    let { sessionid, userslug, newsline, switch: switchParam, tag,filters,q }: { sessionid?: string, userslug?: string, newsline: string, switch: 'on' | 'off', tag: string, filters: string[], q?: string } = body;

    const id = userslug || sessionid;
    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});

    if (!redis)
        return res.status(500).json({ msg: "Unable to create redis" })
    if (!id)
        return res.status(200).json({ success: false, msg: "userslug or sessionid is missing" })
    try {

        const userNewslineKey = `user-definition-newsline-${newsline}-${id}`;
      //  l(chalk.green.bold(js({userNewslineKey,userslug,sessionid,id})));
       
        await updateUserNewsline({type:userslug?'user':'session',newsline,sessionid,userslug, threadid, key: `${newsline}-${id}`, tag, switchParam })

       
        await redis.del(userNewslineKey);  //next fetch would repopulate redis from db.   
        const publications=await fetchAll({redis,threadid,sessionid,userslug,newsline,filters,q})
       // l(chalk.yellow.bold("================>>>>>>>>>>>>>>>>>>>>>>>>>>>>>Result myNewsline:", js(publications)));
        return res.status(200).json({
            success: true,
            publications
        })
    }
    catch (x) {
        l(chalk.red.bold("Exception in updateAll", x));
        return res.status(500).json({})
    }
    finally {
        dbEnd(threadid);
        redis.quit();
    }

    res.status(200).json({})
}
