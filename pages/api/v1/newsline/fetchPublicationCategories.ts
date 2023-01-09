// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { getNewslinePublicationCategories } from "../../../../lib/db/newsline"
import { dbLog, dbEnd } from "../../../../lib/db"
import { RedisKey } from 'ioredis';

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


    // console.log("inside fetchExplore handler",req.body)
    const body = req.body;
    let { newsline }: {  newsline: string} = body;

    
    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
    l(chalk.cyan.bold("publicationCategories"))
    if (!redis)
        return res.status(500).json({ msg: "Unable to create redis" })
    try {

        const redisKey: RedisKey = `publication-categories-${newsline}`;
        let publicationCategoriesRaw = await redis.get(redisKey);
        let publicationCategories:string[]|null=null
        if(publicationCategoriesRaw)
            publicationCategories=JSON.parse(publicationCategoriesRaw);
        l(chalk.yellow.bold("from redis",js(publicationCategories)))
        if (!publicationCategories||publicationCategories.length==0) {
            //get from db and populate redis
            l("call db")
            publicationCategories = await getNewslinePublicationCategories({ threadid, newsline }); //sorted array of {name,tag,icon}
            if (publicationCategories) {
                console.log("Got publicationCategorise from DB:",js(publicationCategories))
                publicationCategoriesRaw=JSON.stringify(publicationCategories) ;
               await redis.setex(redisKey,7*24*3600,publicationCategoriesRaw);
            }
        }
       
       
        return res.status(200).json({
            success: true,
            publicationCategories: publicationCategories,
        })

    }
    catch (x) {
        l(chalk.red.bold("Exception in publicationCategories", x));
        return res.status(500).json({})
    }
    finally {
        l("end of publicationCategories")
        dbEnd(threadid);
        redis.quit();
    }
}
