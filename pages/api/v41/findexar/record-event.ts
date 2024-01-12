import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep } from "../../../../lib/common";
import { recordEvent } from "../../../../lib/functions/dbservice";
import { dbEnd } from "../../../../lib/db";

const handleRequest = async (req: NextApiRequest, res: NextApiResponse) => {
    await NextCors(req, res, {
        // Options
        methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
        origin: "*",
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });
    let threadid = Math.floor(Math.random() * 100000000);
    try {
        let { sessionid, name, params } = req.query;
        console.log("events/record:", { sessionid, name, params });
        await recordEvent({ threadid, sessionid: process.env.event_env + ":" + (sessionid as string || ""),sid:sessionid as string||'', params: params as string, name: name as string});
        return res.status(200).json({ success: true });
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

