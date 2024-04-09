import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep } from "../../../../lib/common";
import { recordEvent } from "../../../../lib/functions/dbservice";
import reqPrayer  from "../../../../lib/functions/prayer";
import { dbEnd } from "../../../../lib/db"
import {getAvailability} from "../../../../lib/functions/sauna";

const handleRequest = async (req: NextApiRequest, res: NextApiResponse) => {
    await NextCors(req, res, {
        // Options
        methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
        origin: "*",
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });
    let threadid = Math.floor(Math.random() * 100000000);
    try {
        let {request="",api_key="",sessionid=""} = req.query as {request:string,api_key:string,sessionid:string};
       /* if(api_key!=process.env.LAKE_API_KEY){
            return res.status(401).json({ success: false });
        }*/
  
        let calendar=await getAvailability(threadid,'little-lake-sauna');
       // if(request){
        //    l(chalk.greenBright("get-story: sid",sid)  )
           // let prayer=await reqPrayer(request);
           // await recordEvent({ threadid, sessionid: process.env.event_env + ":" + sessionid ,sid:sessionid , params: `{"request":"${encodeURIComponent(request)}","prayer":"${encodeURIComponent(prayer||"")}"}`, name: "prayer-api-request"});
    
           // l(chalk.greenBright("get-mentions: mentions",js(mentions))  )
        //}
        return res.status(200).json({ success: true,calendar });
    }
    catch(x){
        console.log("Error in get-story:", x);
        return res.status(500).json({ success: false });
    }    
    finally {       
        dbEnd(threadid)
    }
};
export default handleRequest;

