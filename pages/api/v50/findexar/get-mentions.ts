import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep,microtime } from "../../../../lib/common";
import {fetchSessionMentions} from "../../../../lib/functions/dbservice";
import { dbEnd } from "../../../../lib/db"

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
        let {league="",userid="",sessionid="",api_key="",teamid="",name="",myteam="",page=""} = req.query as {league:string,userid:string,sessionid:string,api_key:string,teamid:string,name:string,myteam:string,page:string};
        if(!page)
            page='0';
        if (userid&&(api_key != process.env.LAKE_API_KEY)) {
            return res.status(401).json({ success: false });
        }
        const mentions=await fetchSessionMentions({ threadid,league,userid,sessionid,teamid,name,myteam,page})
        //l("MENTIONS:",js(mentions))
        console.log("get-mentions: league",league,"userid",userid,"teamid",teamid,"name",name,",myteam",myteam,"page",page,"count",mentions.length,"time:",microtime()-t1);
      
        return res.status(200).json({ success: true,mentions });
    }
    catch(x){
        console.log("Error in fetch-mentions:", x);
        return res.status(500).json({ success: false });
    }    
    finally {       
        dbEnd(threadid)
    }
};
export default handleRequest;

