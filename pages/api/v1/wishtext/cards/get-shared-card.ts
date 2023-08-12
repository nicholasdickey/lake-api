
// ./pages/api/v1/channel/fetch.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js,ds } from "../../../../../lib/common";
import {  dbEnd } from "../../../../../lib/db"
import {getSharedCard} from "../../../../../lib/db/wishtext"
import CardData from "../../../../../lib/types/card-data";
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

    let { sessionid='',id} = req.query;
    id=ds(id as string);
    console.log("API: getSharedCard", sessionid, id);
    let threadid = Math.floor(Math.random() * 100000000);
    try{
    const record:CardData= await getSharedCard({threadid, sessionid: sessionid as string,id}); 
    l(chalk.greenBright("getSharedCard API>",record)) 
        const ret = record?{
           success: true,
           card:record
        }:{
            success: false,
            msg: "Unable to get getSessionCards for sessionid:", sessionid
        }
        res.status(200).json(ret);
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
