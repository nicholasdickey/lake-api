
// ./pages/api/v1/channel/fetch.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../../lib/common";
import {  dbEnd } from "../../../../../lib/db"
import {addSessionImage} from "../../../../../lib/db/wishtext"
import ImageData from "../../../../../lib/types/image-data";
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

    //let { sessionid=''} = req.query;
    const body=req.body;
    const {image,sessionid}=body;
    
    let threadid = Math.floor(Math.random() * 100000000)
    
    try{
        const images= await addSessionImage({threadid, sessionid: sessionid as string,image});  
        const ret = images?{
            success: true,
            images
        }:{
            success: false,
            msg: "Unable to  addSessionImage for sessionid:", sessionid,image
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
