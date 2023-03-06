import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis";
import { dbLog, dbEnd } from "../../../../lib/db";
import { getQwiket } from "../../../../lib/db/qwiket";
import { processBody } from "../../../../lib/processBody";
import { Qwiket } from "../../../../lib/types/qwiket";
import { unpublishQwiket } from "../../../../lib/db/qwiket"

type Data = any

interface Query {
    slug?: string,
    withBody: [0, 1],
    userslug?: string,
    sessionid: string,
    tag?: string,
    ack?: number
}
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

    const { slug, tag }: Query = req.query as unknown as Query;
    l(chalk.green.bold("INPUBLISH",js({slug,  tag })))
    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
    if (!redis)
        return res.status(500).json({ msg: "Unable to connect to redis" });

    try {
        let txid: string = '';

        const key = `txid-${slug}`;
        //l('txid--:',key)
        txid = await redis.get(key) || '';

        l(chalk.yellow.bold("tttxid:", slug,txid))

        if (txid) {
            const keyTagPublished = `tids-cat-published-${tag}`;
            const keyTagShared = `tids-cat-shared-${tag}`;
            l(chalk.green.bold("removing",js({keyTagPublished,keyTagShared})));
            await redis.zrem(keyTagPublished, txid);
            await redis.zrem(keyTagShared, txid);
            await unpublishQwiket({ threadid, slug: slug || "" })
            const lKey = '2l-tids';
            const newslines = await redis.zrevrange(lKey, 0, 10000);
            for (let i = 0; i < newslines.length; i++) {
                const newsline = newslines[i];
                if (newsline.indexOf(tag || "") >= 0) {
                    const keyPublished = `tids-${newsline}-published`;
                    const keyShared = `tids-${newsline}-shared`;
                    l(chalk.green.bold("removing",js({i,keyPublished,keyShared})));
                    await redis.zrem(keyPublished, txid);
                    await redis.zrem(keyShared, txid);
                }
            }
        }
        res.status(200).json({ success: true, });
    }
    catch (x) {
        l(chalk.red.bold(x));
        res.status(501).json(x);
    }
    finally {
        await redis?.quit();
        dbEnd(threadid);
    }

}
