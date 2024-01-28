import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep } from "../../../../lib/common";
import { getStory } from "../../../../lib/functions/dbservice";
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
        let {sid} = req.query;
        let story=null;
        if(sid){
            l(chalk.greenBright("get-story: sid",sid)  )
            story=await getStory({ threadid,sid:sid as string});
           // l(chalk.greenBright("get-mentions: mentions",js(mentions))  )
        }
        return res.status(200).json({ success: true,story });
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

