// ./pages/api/v1/channel/fetch.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { getChannelConfig } from "../../../../lib/db/config"
import {  dbEnd } from "../../../../lib/db"

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

    let { slug } = req.query;

    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
    if (!redis)
        return res.status(500).json({ msg: "Unable to create redis" })

    try {
        const channelConfigKey = `channel-${slug}-config`;
        let channelConfig = await redis.get(channelConfigKey);
        let jsonChannelConfig;
        if (!channelConfig) {
            jsonChannelConfig = await getChannelConfig({ threadid, channel: slug })
            jsonChannelConfig.config = JSON.parse(jsonChannelConfig.config);
            channelConfig = JSON.stringify(jsonChannelConfig);
            if (channelConfig)
                redis.setex(channelConfigKey, 365 * 24 * 3600, channelConfig);
        }
        else {
            jsonChannelConfig = JSON.parse(channelConfig);
        }

        if (!jsonChannelConfig)
            return res.status(500).json({ msg: "Unable to parse channel config" });
      
        const channelDetails = {
            comment: jsonChannelConfig.config.comment,
            displayName: jsonChannelConfig.config.displayName,
            slug: jsonChannelConfig.channelSlug,
            shortname: jsonChannelConfig.config.shortname,
            description: jsonChannelConfig.config.description,
            hometown: jsonChannelConfig.config.hometown,
            logo: jsonChannelConfig.config.logo,
            lacantinaName: jsonChannelConfig.config.lacantinaName,
            lacantinaSlug: jsonChannelConfig.config.lacantinaSlug,
            lowline: jsonChannelConfig.config.lowline,
            topline: jsonChannelConfig.config.topline,
            mobileLayouts: jsonChannelConfig.config.mobileLayouts,
            lacantinaUrl: jsonChannelConfig.config.lacantinaUrl
        }
        const newsline = jsonChannelConfig.newsline;
        const ret = {
            channelDetails,
            newsline,
            channelSlug: jsonChannelConfig.channelSlug
        }
        res.status(200).json(ret)
    }
    catch (x) {
        l(chalk.red.bold(x));
        res.status(501).json(x);
    }
    finally {
        await redis.quit();
        dbEnd(threadid);
    }
}
