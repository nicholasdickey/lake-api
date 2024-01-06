import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep } from "../../../../../../lib/common";
import { updateTrackerFilterOption } from "../../../../../../lib/functions/dbservice";
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
        let { userid,api_key,tracker_filter} = req.query;
        if(api_key!=process.env.LAKE_API_KEY){
            return res.status(401).json({ success: false ,message:"Invalid api_key",exists:false});
        }
        console.log("set-tracker-filter",userid,tracker_filter)
        const options=await updateTrackerFilterOption({ threadid,userid:userid as string||"",tracker_filter:tracker_filter as string||""});
       
        return res.status(200).json({ success: true});
    }
    catch(x){
        console.log("Error in getDetails:", x);
        return res.status(500).json({ success: false});
    }    
    finally {    
        dbEnd(threadid)
    }
};
export default handleRequest;

