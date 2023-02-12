

import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../../lib/common";
import { getRedisClient } from "../../../../../lib/redis"
import { getUser } from "../../../../../lib/db/user"
import { dbLog, dbEnd } from "../../../../../lib/db"
import { submitCurrentSitemap } from "../../../../../lib/google/submitCurrentSitemap"
const { getISODay, addDays,startOfDay,formatISO } = require("date-fns");


function getDayInPast(targetISODay:number, fromDate = new Date()) {
 //7-Sunday,1-Monday -- ISO

  // dayOfWeekMap[dayOfWeek] get the ISODay for the desired dayOfWeek
 // const targetISODay =// dayOfWeekMap[dayOfWeek] as number;
  const fromISODay = getISODay(fromDate);

  // targetISODay >= fromISODay means we need to trace back to last week
  // e.g. target is Wed(3), from is Tue(2)
  // hence, need to -7 the account for the offset of a week
  const offsetDays =
    targetISODay >= fromISODay
      ? -7 + (targetISODay - fromISODay)
      : targetISODay - fromISODay;

  return formatISO(startOfDay(addDays(fromDate, offsetDays)));
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
    const [slug,newsline,forum]=req.query.slug||['','',''];
    const date=getDayInPast(7);
    const sitemapName=
    l(chalk.yellow("SEO",slug,date,newsline,forum)); // slug=/[forum]/[topic]/[tag]/[threadid]/
    
    //1. Add directly to GOOGLE index
    //2. Resubmit current sitemap
    //   2.1 Construct the last Sunday ISO date
    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
    if (!redis)
        return res.status(500).json({msg:"Unable to create redis"})
      
   
    try {

 
        res.status(200).json({success:true,date})
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
