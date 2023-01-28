
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

    let { channel, sessionid, userslug, pageType, thick, dense, layoutNumber,leftOverride } = req.query;
    //l(chalk.blue("layoutNumber",layoutNumber))
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
      //  l(chalk.green("channelConfig from redis",channelConfigKey,channelConfig))
        let jsonChannelConfig;
        if (!channelConfig) {
           // l(chalk.red("NO channel layout, calling db"))
            jsonChannelConfig = await getChannelConfig({ threadid, channel })
            jsonChannelConfig.config=JSON.parse(jsonChannelConfig.config);
            channelConfig=JSON.stringify(jsonChannelConfig);
           // l("return from db",channelConfig)
            if(channelConfig)
            redis?.setex(channelConfigKey, 365 * 24 * 3600, channelConfig);
        }
        else {
            jsonChannelConfig=JSON.parse(channelConfig);
        }
        if(!jsonChannelConfig)
            return res.status(500).json({msg:"Unable to parse channel config"})
        //l(chalk.yellow("got layout",js(jsonChannelConfig.config.layout)))
        const channelLayout =jsonChannelConfig.config.layout;
        if (!thick)
            thick = "0";
        if (!dense)
            dense = "0";

        let density = +thick ? +dense ? "dense" : "thick" : "normal";
       l(chalk.green.bold("call processLayout",js({channelLayout})))
        const layout = processLayout({ channelLayout, userLayout, pageType, density, layoutNumber,leftOverride })
       l(chalk.yellow.bold(js({outputPayout:layout})))
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
