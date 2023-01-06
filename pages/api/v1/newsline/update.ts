// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { getChannelNewsline, getUserNewsline, getSessionNewsline, getNewslinePublications } from "../../../../lib/db/newsline"
import { dbLog, dbEnd } from "../../../../lib/db"


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        res.status(405).send({ message: 'Only POST requests allowed' });
        return;
    }

    // console.log("inside fetchExplore handler",req.body)
    const body = req.body;
    let { sessionid, userslug, newsline, action, tag}: { sessionid?: string, userslug?: string, newsline: string, action: string,tag:string } = body;
    if (newsline == 'qwiket')
        newsline = 'usconservative';
    const id = userslug || sessionid;
    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});

    if (!redis)
        return res.status(500).json({ msg: "Unable to create redis" })
    try {

        const defaultNewslineKey = `newsline-${newsline}`;
        const userNewslineKey = id ? `newsline-${newsline}-${id}` : `newsline-${newsline}`;
       
            if (userslug) {
                newslineObjectRaw = await updatetUserNewsline({ threadid, key: `${newsline}-${userslug}` })
                if (newslineObjectRaw)
                    await redis.setex(userNewslineKey, 7 * 24 * 3600, newslineObjectRaw);
            }
            else if (sessionid) {
                newslineObjectRaw = await getSessionNewsline({ threadid, key: `${newsline}-${sessionid}` })
                if (newslineObjectRaw)
                    await redis.setex(userNewslineKey, 7 * 24 * 3600, newslineObjectRaw);
            }
            else {
                newslineObjectRaw = await getChannelNewsline({ threadid, newsline })
                if (newslineObjectRaw)
                    await redis.setex(defaultNewslineKey, 30 * 24 * 3600, newslineObjectRaw);
            }
            if (newslineObjectRaw) {
                newslineObject = JSON.parse(newslineObjectRaw);
            }
            else {
                res.status(200).json({
                    success:false,
                    msg:"Can't get newsline"});
            }

        }
        const newslineCategoriesKey = `all-publications-${newsline};`
        let allPublicationsRaw = await redis.get(newslineCategoriesKey);
        let allPublications;
        if (allPublicationsRaw) {
            allPublications = JSON.parse(allPublicationsRaw);
        }
        else {
            //get from db
            allPublicationsRaw = await getNewslinePublications({ threadid, newsline, filter });
            if (allPublicationsRaw) {
                allPublications = JSON.parse(allPublicationsRaw);
            }
            else {
                res.status(200).json({
                    success:false,
                    msg:"Can't get publications for newsline and filter"
                })
            }
        }
        
        //add inclulsion in newsline status

        res.status(200).json({
            success:true,
            publications:allPublications,
            feeds:newslineObject
        })

    }
    catch (x) {
        l(chalk.red.bold("Exception in fetchExplore", x));
        return res.status(500).json({})
    }

    res.status(200).json({})
}
