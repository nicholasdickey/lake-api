import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep,microtime } from "../../../../../lib/common";
import {fetchMentions} from "../../../../../lib/functions/dbservice";
import { dbEnd } from "../../../../../lib/db"

const handleRequest = async (req: NextApiRequest, res: NextApiResponse) => {
    await NextCors(req, res, {
        // Options
        methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
        origin: "*",
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });
    let threadid = Math.floor(Math.random() * 100000000);
    try {
        const t1=microtime();


        let {league,userid,api_key,teamid,name,myteam,page} = req.query;
        if(!page)
            page='0';
        if (userid&&(api_key != process.env.LAKE_API_KEY)) {
            return res.status(401).json({ success: false });
        }
        const mentions=await fetchMentions({ threadid,league:league as string,userid:userid as string||"",teamid:teamid as string||"",name:name as string||"",myteam:myteam as string||"",page:page as string||""})
        //l("MENTIONS:",js(mentions))
        console.log("fetch-mentions: league",league,"userid",userid,"teamid",teamid,"name",name,",myteam",myteam,"page",page,"count",mentions.length,"time:",microtime()-t1);
      
        return res.status(200).json({ success: true,mentions });
    }
    catch(x){
        console.log("Error in events/record:", x);
        return res.status(500).json({ success: false });
    }    
    finally {       
        dbEnd(threadid)
    }
};
export default handleRequest;

