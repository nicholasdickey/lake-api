//./pages/api/v1/layout/fetch.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { getSessionLayout, getUserLayout, getChannelConfig } from "../../../../lib/db/config"
import { dbEnd } from "../../../../lib/db"
import { processLayout } from "../../../../lib/layout"


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

    let { channel, sessionid, userslug, pageType, thick, dense, layoutNumber,leftOverride } = req.query;
    if(dense=='1')
    thick='1';
    let userConfigKey = null;
    let userLayout = null;
    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
    if(!redis)
        return res.status(500).json({msg:"Unable to connect to redis"});
    try {
        if (userslug) {
            userConfigKey = `${userslug}-config`;
            userLayout = await redis?.get(
                userConfigKey
            )
            if (!userLayout) {
                userLayout = await getUserLayout({ threadid, slug: userslug })
                await redis?.setex(userConfigKey, 7 * 24 * 3600, userLayout)
            }
            userLayout = JSON.parse(userLayout);
            userLayout = userLayout.userLayout.layout;
        }
        if (sessionid) {
            userConfigKey = `${sessionid}-layout`;
            userLayout = await redis?.get(
                userConfigKey
            )
            if (!userLayout) {
                userLayout = await getSessionLayout({ threadid, sessionid })
                redis?.setex(userConfigKey, 24 * 3600, userLayout);
            }
            userLayout = JSON.parse(userLayout);
        }
        const channelConfigKey = `channel-${channel}-config`;
        let channelConfig = await redis.get(channelConfigKey);
     
        let jsonChannelConfig;
        if (!channelConfig) {
            jsonChannelConfig = await getChannelConfig({ threadid, channel })
            jsonChannelConfig.config=JSON.parse(jsonChannelConfig.config);
            channelConfig=JSON.stringify(jsonChannelConfig);
            if(channelConfig)
            redis?.setex(channelConfigKey, 365 * 24 * 3600, channelConfig);
        }
        else {
            jsonChannelConfig=JSON.parse(channelConfig);
        }
        if(!jsonChannelConfig)
            return res.status(500).json({msg:"Unable to parse channel config"})
      
        const channelLayout =jsonChannelConfig.config.layout;
        if (!thick)
            thick = "0";
        if (!dense)
            dense = "0";

        let density = +thick ? +dense ? "dense" : "thick" : "normal";
        const layout = processLayout({ channelLayout, userLayout, pageType, density, layoutNumber,leftOverride })
        res.status(200).json(layout)
    }
    catch (x) {
        l(chalk.red.bold(x)); 
        res.status(501).json(x);      
    }
    finally{
        redis?.quit();
        dbEnd(threadid);
    } 
}
