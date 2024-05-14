import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep } from "../../../../lib/common";
import { getFilteredLeagueSessionMentions,getFilteredAllSessionMentions } from "../../../../lib/functions/dbservice";
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
        let {league="",userid="",api_key="",sessionid="",page="0"} = req.query as {league:string,userid:string,api_key:string,sessionid:string,page:string};
        if(api_key!=process.env.LAKE_API_KEY){
            return res.status(401).json({ success: false });
        }
        let mentions;
      
        if(league){
           // l(chalk.greenBright("get-my-feed: league",league)  )
            mentions=await getFilteredLeagueSessionMentions({ threadid,league,userid,sessionid,page:Number(page)});
           // l(chalk.greenBright("get-filtered-mentions: mentions",js(mentions))  )
        }
        else {
           // l(chalk.yellowBright("get-my-feed: all",userid,sessionid ))
            mentions=await getFilteredAllSessionMentions({ threadid,userid,sessionid,page:Number(page)});
        }   
        
        return res.status(200).json({ success: true,mentions });
    }
    catch(x){
        console.log("Error in get-my-feed:", x);
        return res.status(500).json({ success: false });
    }    
    finally {       
        dbEnd(threadid)
    }
};
export default handleRequest;

