import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep } from "../../../../lib/common";
import { getSlugStory } from "../../../../lib/functions/dbservice";
import { dbEnd } from "../../../../lib/db"
import { getRedisClient } from "../../../../lib/redis";

const handleRequest = async (req: NextApiRequest, res: NextApiResponse) => {
    await NextCors(req, res, {
        // Options
        methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
        origin: "*",
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });
    let threadid = Math.floor(Math.random() * 100000000);
    const redis = await getRedisClient({});
    try {
        let {slug} = req.query;
        let story=null;
        if(slug=='undefined'){
            return res.status(200).json({ success: false,msg:"slug is undefined" });
        }
        if(slug){
            l(chalk.greenBright("get-story: slug",slug)  )
            const key = `findexar-story-${slug}`;
            const storyJson = await redis?.get(key);
            console.log("storyJson",storyJson)
            if(storyJson){
                story=JSON.parse(storyJson);
            }
            else {
                story=await getSlugStory({ threadid,slug:slug as string});
                await redis?.setex(key, 7*24*3600, JSON.stringify(story));
            }
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

