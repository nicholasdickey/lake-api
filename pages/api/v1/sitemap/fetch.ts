

import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { dbLog, dbEnd } from "../../../../lib/db"
import {getRssNewsline} from "../../../../lib/db/qwiket"
import {formatISO,addDays,parseISO,sub} from 'date-fns'
import fetchAll from "../../../../lib/fetchAll"
type Data = any

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    await NextCors(req, res, {
        // Options
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        origin: '*',
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    const { newsline, startDate} = req.query;
    //console.log(startDate)
    let dateStart=parseISO(startDate as string);
    let dateEnd=sub(addDays(dateStart,7),{seconds:1});
    const timeStart=dateStart.getTime()/1000|0;
    const timeEnd=dateEnd.getTime()/1000|0;
    console.log('SITEMAP REQ',dateStart.getTime(), dateEnd.getTime(),timeStart,timeEnd);
    console.log("dates:",formatISO(dateStart),formatISO(dateEnd));
    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
    if (!redis)
        return res.status(500).json({ msg: "Unable to create redis" })

    try {
        const allPublications=await fetchAll({redis,threadid,sessionid:'',userslug:'',newsline: newsline as string,filters:[]})
        
        const key=`'${allPublications?.map(p=>p.tag).join(`','`)}'`
        const range =await getRssNewsline({threadid,key,timeStart,timeEnd});
        l(222)
        const sitemap=range.map((m:any)=>`${m.tag}/${m.threadid}`)//.join(',');
        l(chalk.yellow.bold(key,range.length,sitemap.length,timeEnd,timeStart,key,JSON.stringify(sitemap)))
        res.status(200).json({success:true,sitemap})
    }

    catch (x) {
        l(chalk.red.bold(x))
        res.status(501).json(x);
    }
    finally {
        redis.quit();
        dbEnd(threadid);
    }

}
