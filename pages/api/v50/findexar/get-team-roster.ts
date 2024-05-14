import type { NextApiRequest, NextApiResponse } from "next";
import { getRedisClient } from "@/lib/redis";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep } from "../../../../lib/common";
import { getTeamPlayers } from "../../../../lib/functions/dbservice";
import { dbEnd } from "../../../../lib/db"
import { redis } from "googleapis/build/src/apis/redis";

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
      
        if (!redis)
        return res.status(500).json({ msg: "Unable to connect to redis" });
    
        const t1=Date.now();
        let {teamid,userid} = req.query;
        const key = `cache-team-roster-${teamid}-${userid}`;
     
        let roster = await redis?.get(key);
        if (roster) {
            console.log("TEAMROSTER IN CACHE", key);
            l("get-team-roster", js({ time: Date.now() - t1 }));
            return res.status(200).json({ success: true, players: JSON.parse(roster) });
        }
        const players = await getTeamPlayers({ threadid, teamid: teamid as string, userid: userid as string || "" });
        l("get-team-roster", js({ time: Date.now() - t1 }));
       return res.status(200).json({ success: true,players });
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

