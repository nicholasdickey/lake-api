import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep } from "../../../../../../lib/common";
import { addTrackerListMember } from "../../../../../../lib/functions/dbservice";
import { dbEnd } from "../../../../../../lib/db"
import {initTeamRostersCache} from "@/lib/functions/qwiket-cache" 

const handleRequest = async (req: NextApiRequest, res: NextApiResponse) => {
    await NextCors(req, res, {
        // Options
        methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
        origin: "*",
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });
    let threadid = Math.floor(Math.random() * 100000000);
    try {
        let { userid="", api_key, member='', teamid="",subscrLevel="0" } = req.query as { userid: string, api_key: string, member: string, teamid: string,subscrLevel:string };
       
        if(api_key!=process.env.LAKE_API_KEY){
            return res.status(401).json({ success: false });
        }
        l(chalk.yellowBright("API add tracker list member called",userid,member,teamid));
        const ret= await addTrackerListMember({ threadid, userid, member: member || "", teamid,subscrLevel});
        await initTeamRostersCache(threadid, userid , teamid );
        res.status(200).json(ret);
    }
    catch(x){
        console.log("Error in addTrackerListMember:", x);
        return res.status(500).json({ success: false ,error:x});
    }    
    finally {    
        dbEnd(threadid)
    }
};
export default handleRequest;

