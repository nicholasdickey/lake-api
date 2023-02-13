import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { getUser } from "../../../../lib/db/user"
import { dbLog, dbEnd } from "../../../../lib/db"

 const  onlineCount=async (identity:string,redis:any)=> {
    // let zcount = await redis.zcount('online', '-inf', '+inf');
    // console.log("onlineCount=", count, identity)

    if (identity) {
        if (Array.isArray(identity)) identity = identity[0];
        // console.log("onlineCount2=", count, identity)
        var d = new Date();
        var q =
            "user-count-" +
            d.getDate() +
            (d.getMonth() + 1) +
            d.getFullYear();
        var mq = "user-count-" + (d.getMonth() + 1) + d.getFullYear();
        // console.log('u-count:',q)
        let sq = await redis.zscore(q, identity);
        if (!sq) {
            redis.zadd(q, (Date.now() / 1000) | 0, identity);

           
        }
        sq = await redis.zscore(mq, identity);
        if (!sq) {
            redis.zadd(mq, (Date.now() / 1000) | 0, identity);
           
        }
        redis.publish("drsyncdb", "update");
        redis.expire(q, 365 * 24 * 3600);
        //redis.zremrangebyscore(q,0,((Date.now()/1000)|0)-30*24*3600)
        redis.zadd("online", (Date.now() / 1000) | 0, identity);
        redis.expire("online", 365 * 24 * 3600);

        o = drsyncFormat(
            "redis-zadd",
            "online||" + ((Date.now() / 1000) | 0),
            identity,
            365 * 24 * 3600
        );
        //   console.log("%%% %%% %%% DRSYNC ",o);
        redis.lpush("drsyncdb", o);
        redis.publish("drsyncdb", "update");

        await redis.zremrangebyscore(
            "online",
            0,
            ((Date.now() / 1000) | 0) - 1800
        );
        let count = await redis.zcount("online", "-inf", "+inf");
        let dayCount = await redis.zcount(q, "-inf", "+inf");
        return `{"success":true,"count":${count},"daycount":${dayCount}}`;
    } else {
        return resolve(`{"success":false}`);
    }
}



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
    let { userslug,sessionid } = req.query;
    const id=userslug||sessionid||'';
    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
    if (!redis)
        return res.status(500).json({msg:"Unable to create redis"})
        if(!userslug)
        return res.status(200).json({user:{}})
   
    try {

        const userKey = `user-${userslug}`;
        console.log("redis.get",userKey)
        let user = await redis.get(userKey);
        console.log("redis.get",userKey,user)
        let jsonUser;
        if (!user) {
            l(chalk.red("USER FETCH NO user, calling db"))
            jsonUser = await getUser({ threadid, slug:userslug as string })
            user=JSON.stringify(jsonUser)
            redis.setex(userKey, 365 * 24 * 3600, user);
        }
        else {
            jsonUser=JSON.parse(user);
        }
       
        if (!jsonUser)
            return res.status(500).json({msg:"Unable to parse user"});
 
        res.status(200).json({success:true,user:jsonUser})
    }

    catch (x) {
        l(chalk.red.bold(x));
        res.status(501).json({success:false})
      
    }
    finally{
        redis.quit();
        dbEnd(threadid);
    }

}
