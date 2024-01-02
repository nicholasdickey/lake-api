import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep } from "../../../../lib/common";
import { getAthletePhoto } from "../../../../lib/functions/dbservice";
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
        let {teamid,name} = req.query;
        const photo=await getAthletePhoto({ threadid,teamid:teamid as string,name:name as string});
        l(chalk.greenBright(`get-player-photo: teamid=${teamid} name=${name} photo=${photo}`))
        
        return res.status(200).json({ success: true,photo });
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

