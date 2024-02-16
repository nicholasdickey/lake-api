import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep, microtime } from "../../../../../lib/common";
import { fetchStories } from "../../../../../lib/functions/dbservice";
import { dbEnd } from "../../../../../lib/db"
import { getRedisClient } from "../../../../../lib/redis";

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
        const t1 = microtime();

        let { league, userid, api_key, page,force } = req.query;
        userid = userid == 'null' ? '' : userid;

        if (!page)
            page = '0';
        if (userid && (api_key != process.env.LAKE_API_KEY)) {
            return res.status(401).json({ success: false });
        }
        const key = `stories-${league}`;
        let stories;
        if (!userid && !page&&!force) {
            let storiesJson = await redis?.get(key);
            stories = storiesJson ? JSON.parse(storiesJson) : null;
            if (!stories) {
                console.log("NO CACHE");
                stories = await fetchStories({ threadid, league: league as string, userid: userid as string || "", page: page as string || "" })
                await redis?.setex(key, 3600, JSON.stringify(stories));
            }
        }
        else {
            stories = await fetchStories({ threadid, league: league as string, userid: userid as string || "", page: page as string || "" });
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

