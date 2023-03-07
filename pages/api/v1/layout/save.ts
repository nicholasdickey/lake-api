//./pages/api/v1/layout/save.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getRedisClient } from "../../../../lib/redis"
import { getSessionLayout, getUserLayout, getChannelConfig } from "../../../../lib/db/config"
import { dbLog, dbEnd } from "../../../../lib/db"

//layout save is not implemented yet on the client side. The code below has not been tested

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<any>
) {

    const { channel, sessionid, userslug, pageType, thick, dense, layoutNumber } = req.query;

    let userLayout: any = null;
    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
    if (!redis)
        return res.status(500).json({ msg: "Unable to connect to redis" });
    try {
        if (userslug) {
            const userConfigKey = `${userslug}-config`;
            userLayout = await redis.get(
                userConfigKey
            )
            if (!userLayout) {
                userLayout = await getUserLayout({ threadid, slug: userslug })
                await redis.setex(userConfigKey, 7 * 24 * 3600, userLayout)
            }
            userLayout = JSON.parse(userLayout);
            userLayout = userLayout.userLayout.layout;
        }

        if (sessionid) {
            const userConfigKey = `${sessionid}-layout`;
            userLayout = await redis.get(
                userConfigKey
            )
            if (!userLayout) {
                userLayout = await getSessionLayout({ threadid, sessionid })
                redis.setex(userConfigKey, 24 * 3600, userLayout);
            }
            userLayout = JSON.parse(userLayout);

        }
        const channelConfigKey = `channel-${channel}-layout`;
        let channelLayout = await redis.get(channelConfigKey);
        if (!channelLayout) {
            const channelConfig = await getChannelConfig({ threadid, channel })   
            const layout = channelConfig.config.layout;
            channelLayout = JSON.stringify(layout);
            redis.setex(channelConfigKey, 365 * 24 * 3600, channelLayout);
        }
        channelLayout = JSON.parse(channelLayout)
    }
    catch (x) {
        redis.quit();
        dbEnd(threadid);
       return res.status(500).json({success:false})
    }
    res.status(200).json({success:true})
}
