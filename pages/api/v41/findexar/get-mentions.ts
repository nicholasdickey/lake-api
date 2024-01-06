import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep } from "../../../../lib/common";
import { getLeagueMentions,getAllMentions } from "../../../../lib/functions/dbservice";
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
        let {league} = req.query;
        let mentions;
        if(league){
            l(chalk.greenBright("get-mentions: league",league)  )
            mentions=await getLeagueMentions({ threadid,league:league as string});
           // l(chalk.greenBright("get-mentions: mentions",js(mentions))  )
        }
        else 
            mentions=await getAllMentions({ threadid});   
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

