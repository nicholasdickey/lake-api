

import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { getSessionLayout, getUserLayout, getChannelConfig } from "../../../../lib/db/config"
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

    let { slug } = req.query;

    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
    if (!redis)
        return res.status(500).json({msg:"Unable to create redis"})
   
    try {

        const channelConfigKey = `channel-${slug}-config`;
        console.log("redis.get",channelConfigKey)
        let channelConfig = await redis.get(channelConfigKey);
        console.log("redis.get",channelConfigKey,channelConfig)
        let jsonChannelConfig;
        if (!channelConfig) {
            l(chalk.red("CHANNEL CONFIG FETCH NO channel layout, calling db"))
            jsonChannelConfig = await getChannelConfig({ threadid, channel:slug })
            jsonChannelConfig.config=JSON.parse(jsonChannelConfig.config);
            channelConfig=JSON.stringify(jsonChannelConfig);
            l("return from db",channelConfig)
            if(channelConfig)
            redis.setex(channelConfigKey, 365 * 24 * 3600, channelConfig);
        }
        else {
            jsonChannelConfig=JSON.parse(channelConfig);
        }
       
        if (!jsonChannelConfig)
            return res.status(500).json({msg:"Unable to parse channel config"});
        console.log("jsonChannelConfig:",chalk.blue.bold(js(jsonChannelConfig)))  
        const channelDetails={
            comment:jsonChannelConfig.config.comment,
            displayName:jsonChannelConfig.config.displayName,
            slug:jsonChannelConfig.channelSlug,
            shortname:jsonChannelConfig.config.shortname,
            description:jsonChannelConfig.config.description,
            hometown:jsonChannelConfig.config.hometown,
            logo:jsonChannelConfig.config.logo,
            lacantinaName:jsonChannelConfig.config.lacantinaName,
            lacantinaSlug:jsonChannelConfig.config.lacantinaSlug,
            lowline:jsonChannelConfig.config.lowline
        }
        const newsline=jsonChannelConfig.newsline;
        const ret={
            channelDetails,
            newsline,
            channelSlug:jsonChannelConfig.channelSlug
        }
        l(chalk.magenta.bold(js(ret)))
        res.status(200).json(ret)
    }

    catch (x) {
        l(chalk.red.bold(x))
        redis.quit();
        dbEnd(threadid);
    }

}
