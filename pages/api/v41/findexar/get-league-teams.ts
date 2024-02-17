import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep } from "../../../../lib/common";
import { getLeagueTeams } from "../../../../lib/functions/dbservice";
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
        const t1=Date.now();
        let { league, params} = req.query;
        const key = `teams-${league}`;
        let teamsJson = await redis?.get(key);
        let teams = teamsJson ? JSON.parse(teamsJson) : null;
        if(!teams){
            teams=await getLeagueTeams({ threadid,league:league as string});
            await redis?.setex(key, 24*3600, JSON.stringify(teams));
        }
        l("get-league-teams",js({time:Date.now()-t1}));
        return res.status(200).json({ success: true,teams });
    }
    catch(x){
        console.log("Error in events/record:", x);
        return res.status(500).json({ success: false });
    }    
    finally {      
        dbEnd(threadid)
        redis?.quit();
    }
};
export default handleRequest;

