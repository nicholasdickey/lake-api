
// ./pages/api/v1/channel/fetch.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js,ds } from "../../../../../lib/common";
import {  dbEnd } from "../../../../../lib/db"
import {getMetaimage} from "../../../../../lib/db/wishtext"
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

    let {linkid=''} = req.query;
    linkid=ds(linkid as string);
    console.log("API: get-metaimage", linkid);
    let threadid = Math.floor(Math.random() * 100000000);
    try{
    const image= await getMetaimage({threadid, linkid}); 
    l(chalk.greenBright("getSharedCard API>",linkid)) 
        const ret = image?{
           success: true,
           metaimage:image
        }:{
            success: false,
            msg: "Unable to get getMetaimage for linkid:", linkid
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
