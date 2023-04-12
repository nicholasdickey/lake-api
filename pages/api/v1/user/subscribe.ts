//./pages/api/v1/user/accept.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { saveSessionSubscription } from "../../../../lib/db/user"
import { dbEnd } from "../../../../lib/db"

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

    let { subscription,subscription_options, sessionid} = req.query; // for testing;
    if(!subscription){
        const body = req.body;
        subscription=body.subscription;
        subscription_options=body.subscription_options;
        sessionid=body.sessionid;
    }
    let threadid = Math.floor(Math.random() * 100000000)
    try {
        const subscriptionString:string=JSON.stringify(subscription);
        const subscriptionOptions:string=JSON.stringify(subscription_options);
        await saveSessionSubscription({ threadid, sessionid: sessionid as string || '', subscription:subscriptionString,subscriptionOptions });
        res.status(200).json({ success: true})
    }
    catch (x) {
        l(chalk.red.bold(x));
        res.status(501).json({ success: false })
    }
    finally {
        dbEnd(threadid);
    }
}
