import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep,microtime } from "../../../../../lib/common";
import {fetchStories} from "../../../../../lib/functions/dbservice";
import { dbEnd } from "../../../../../lib/db"

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

        let {league,userid,api_key,page} = req.query;
        userid=userid=='null'?'':userid;
       
        if(!page)
            page='0';
        if (userid&&(api_key != process.env.LAKE_API_KEY)) {
            return res.status(401).json({ success: false });
        }
        const stories=await fetchStories({ threadid,league:league as string,userid:userid as string||"",page:page as string||""})

        console.log("fetch-stories===>: league",league,"userid",userid,"page",page,"count",stories.length,"time:",microtime()-t1);
      
        return res.status(200).json({ success: true,stories });
    }
    catch(x){
        console.log("Error in fetch-stories:", x);
        return res.status(500).json({ success: false });
    }    
    finally {       
        dbEnd(threadid)
    }
};
export default handleRequest;

