import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep,microtime } from "../../../../lib/common";
import { getTrackerSessionList } from "../../../../lib/functions/dbservice";
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
        let { userid="",api_key="",league="",sessionid=""} = req.query as {userid:string,api_key:string,league:string,sessionid:string};
        if(api_key!=process.env.LAKE_API_KEY){
            return res.status(401).json({ success: false });
        }
        l(chalk.yellowBright("API get tracker list members called",userid,league));
        const t1=microtime();
        const members=await getTrackerSessionList({ threadid,userid,sessionid,league});
        const t2=microtime();
        l(chalk.yellowBright("API get tracker list members completed",userid,league,members,"in",(t2-t1).toFixed(2),"ms"));
        return res.status(200).json({ success: true,members });
    }
    catch(x){
        console.log("Error in getTrackerList:", x);
        return res.status(500).json({ success: false });
    }    
    finally {    
        dbEnd(threadid)
    }
};
export default handleRequest;

