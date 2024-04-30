import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep } from "../../../../../../lib/common";
import { addTrackerListMember } from "../../../../../../lib/functions/dbservice";
import { dbEnd } from "../../../../../../lib/db"


const handleRequest = async (req: NextApiRequest, res: NextApiResponse) => {
    await NextCors(req, res, {
        // Options
        methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
        origin: "*",
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });
    let threadid = Math.floor(Math.random() * 100000000);
    try {
        let { userid,api_key,member,teamid} = req.query;
        if(api_key!=process.env.LAKE_API_KEY){
            return res.status(401).json({ success: false });
        }
        l(chalk.yellowBright("API add tracker list member called",userid,member,teamid));
        await addTrackerListMember({ threadid,userid:userid as string||"",member:member as string||"",teamid:teamid as string||""});
        return res.status(200).json({ success: true });
    }
    catch(x){
        console.log("Error in addTrackerListMember:", x);
        return res.status(500).json({ success: false });
    }    
    finally {    
        dbEnd(threadid)
    }
};
export default handleRequest;

