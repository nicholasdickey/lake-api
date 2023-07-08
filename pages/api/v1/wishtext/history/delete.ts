// ./pages/api/v1/channel/fetch.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../../lib/common";
import { dbEnd } from "../../../../../lib/db"
import {deleteHistory } from "../../../../../lib/db/wishtext"

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

    let { username = '', to = 0, time = '' } = req.query;

    let threadid = Math.floor(Math.random() * 100000000)
    try {
        await deleteHistory({ threadid, username: username as string, to: to as string, time: time as any});
        const ret = {
            success: true,
        }
        res.status(200).json(ret)
    }
    catch (x) {
        l(chalk.red.bold(x));
        res.status(501).json(x);
    }
    finally {
        dbEnd(threadid);
        return res.status(500);
    }
}
