// ./pages/api/v1/channel/fetch.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../../lib/common";
import {  dbEnd } from "../../../../../lib/db"
import {fetchHistory,getHistories} from "../../../../../lib/db/wishtext"

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

    let { username='',page=0,pagesize=25 } = req.query;

    let threadid = Math.floor(Math.random() * 100000000)
    try{
    const histories= await getHistories({threadid, username: username as string,page:page as number,pagesize:pagesize as number});  
        const ret = history?{
           success: true,
            histories
        }:{
            success: false,
            msg: "Unable to get histories for username:", username
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
