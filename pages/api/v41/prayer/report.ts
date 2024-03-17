import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep } from "../../../../lib/common";
import { reportPrayerEvents } from "../../../../lib/functions/dbservice";
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
       // console.log("events/record called");

        let { sessionid, name, params,page="0",bot='0',min="0" } = req.query as {sessionid:string, name:string, params:string,page:string,bot:string,min:string};
        const retval=await reportPrayerEvents({ threadid,page,bot,min:+min});
     
       // console.log("retval=",js(retval))
        return res.status(200).json({ success: true,report:retval });
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

