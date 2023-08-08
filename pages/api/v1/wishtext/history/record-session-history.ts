
// ./pages/api/v1/channel/fetch.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../../lib/common";
import {  dbEnd } from "../../../../../lib/db"
import {recordSessionHistory} from "../../../../../lib/db/wishtext"

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

    const body=req.body;
    const {greeting,sessionid,occasion,params}:{greeting:string,sessionid:string,occasion:string,params:string}=body;
  
    let threadid = Math.floor(Math.random() * 100000000)
    try{
        console.log("recordSessionHistory",greeting,sessionid,occasion,params)
    const num= await recordSessionHistory({threadid, sessionid, greeting,occasion,params});  
        const ret = num?{
           success: true,
           num
        }:{
            success: false,
            msg: "Unable to get recordSessionHistory for sessionid:"+ sessionid
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
