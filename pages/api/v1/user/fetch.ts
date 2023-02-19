

import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { getUser } from "../../../../lib/db/user"
import { dbLog, dbEnd } from "../../../../lib/db"
import { processLayout } from "../../../../lib/layout"
type Data = any

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    await NextCors(req, res, {
        // Options
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
        origin: '*',
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });
    l(chalk.yellow("fetch user"));
    let { userslug } = req.query;

    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
    if (!redis)
        return res.status(500).json({msg:"Unable to create redis"})
        if(!userslug)
        return res.status(200).json({user:{}})
   
    try {

        const userKey = `user-${userslug}`;
        console.log("redis.get",userKey)
        let user// = await redis.get(userKey);
        console.log("redis.get",userKey,user)
        let jsonUser;
        if (!user) {
            l(chalk.red("USER FETCH NO user, calling db"))
            jsonUser = await getUser({ threadid, slug:userslug as string })
            user=JSON.stringify(jsonUser)
            await redis.setex(userKey, 365 * 24 * 3600, user);
        }
        else {
            jsonUser=JSON.parse(user);
        }
       
        if (!jsonUser)
            return res.status(500).json({msg:"Unable to parse user"});
        l(js({success:true,user:jsonUser}))
        res.status(200).json({success:true,user:jsonUser})
    }

    catch (x) {
        l(chalk.red.bold(x));
        res.status(501).json({success:false})
      
    }
    finally{
        await redis.quit();
        dbEnd(threadid);
    }

}
