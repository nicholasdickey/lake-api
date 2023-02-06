// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import {  updateUserNewsline } from "../../../../lib/db/newsline"
import { dbLog, dbEnd } from "../../../../lib/db"
import fetchNewsline from '../../../../lib/fetchNewsline';
import {updateSession} from "../../../../lib/db/user";
import { updateAsExpression } from 'typescript';

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

   

    console.log("===*** &&& === inside newsline update handler",req.body)
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

        const userNewslineKey = `user-definition-newsline-${newsline}-${id}`;
        if(!userslug&&sessionid){
            await updateSession({threadid,sessionid});
        }
        await updateUserNewsline({type:userslug?'user':'session',sessionid,userslug,newsline, threadid, key: `${newsline}-${userslug}`, tag, switchParam })

        l(chalk.magenta("after update DB, delete from redis"))
        await redis.del(userNewslineKey);  //next fetch would repopulate redis from db.   
        l(chalk.magenta("after  delete from redis key:",userNewslineKey,'result:',await redis.get(userNewslineKey)))
        const myNewsline=await fetchNewsline({redis,threadid,sessionid,userslug,newsline,update:0})
        l(chalk.yellow.bold("((((((((((((((((((((((((((((((( Result myNewsline:", js(myNewsline)));
        return res.status(200).json({
            success: true,
            newsline: myNewsline
        })
    }
    catch (x) {
        l(chalk.red.bold("Exception in ipdate", x));
        return res.status(500).json({})
    }
    finally {
        dbEnd(threadid);
        redis.quit();
    }

    res.status(200).json({})
}
