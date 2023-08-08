
// ./pages/api/v1/channel/fetch.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../../lib/common";
import {  dbEnd } from "../../../../../lib/db"
import {recordSessionCard} from "../../../../../lib/db/wishtext"
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

    let { sessionid=''} = req.query;
    const body=req.body;
    const {card}:{card:CardData,sessionid:string}=body;
    
    let threadid = Math.floor(Math.random() * 100000000)
    try{
    const {cardNum,linkid}= await recordSessionCard({threadid, sessionid: sessionid as string,card});  
        const ret = linkid?{
            success: true,
            cardNum,
            linkid
        }:{
            success: false,
            msg: "Unable to  recordSessionCard for sessionid:", sessionid
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
