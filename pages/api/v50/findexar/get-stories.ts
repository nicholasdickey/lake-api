import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep, microtime } from "../../../../lib/common";
import { fetchSessionStories } from "../../../../lib/functions/dbservice";
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
    l(chalk.blueBright("BEGIN FETCH-STORIES"));
    try {
        const t1 = microtime();

        let { league,sessionid, userid, api_key, page,force } = req.query as {league:string,sessionid:string,userid:string,api_key:string,page:string,force:string};
        userid = userid == 'null' ? '' : userid||"";
        force = force == 'true'||force=='1' ? "1" : "0";
        if (!page)
            page = '0';
        if (userid && (api_key != process.env.LAKE_API_KEY)) {
            return res.status(401).json({ success: false });
        }
        const key = `stories-${league}`;
        console.log("fetch-stories inputs:", key, userid, page, force);
        let stories;
        if (!userid && !(+page)&&!(+force)) {
            console.log("TRYING CACHE",key);
            let storiesJson = await redis?.get(key);
            stories = storiesJson ? JSON.parse(storiesJson) : null;
            if (!stories) {
                console.log("NO CACHE");
                stories = await fetchSessionStories({ threadid, league, userid,sessionid, page})
                await redis?.setex(key, 3600, JSON.stringify(stories));
            }
            else {
                console.log("CACHE!!!");       
            }
        }
        else {
            stories = await fetchSessionStories({ threadid, league, userid,sessionid, page });
            if(!userid&&!page)
                await redis?.setex(key, 3600, JSON.stringify(stories));
        }

        /*const stories=await fetchStories({ threadid,league:league as string,userid:userid as string||"",page:page as string||""})*/
        const t2 = microtime();
        console.log("fetch-stories:", t2 - t1);
        return res.status(200).json({ success: true, stories });
    }
    catch (x) {
        console.log("Error in fetch-stories:", x);
        return res.status(500).json({ success: false });
    }
    finally {
        dbEnd(threadid);
        redis?.quit();
    }
};
export default handleRequest;

