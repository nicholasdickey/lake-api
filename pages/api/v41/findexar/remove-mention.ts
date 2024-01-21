import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep } from "../../../../lib/common";
import { removeMention } from "../../../../lib/functions/dbservice";
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
        let {findexarxid} = req.query;
        let mention=null;
        if(findexarxid){
            l(chalk.greenBright("remove-mention: findexarid",findexarxid)  )
            await removeMention({ threadid,findexarxid:findexarxid as string});
           // l(chalk.greenBright("get-mentions: mentions",js(mentions))  )
        }
        return res.status(200).json({ success: true });
    }
    catch(x){
        console.log("Error in remove-mention:", x);
        return res.status(500).json({ success: false });
    }    
    finally {       
        dbEnd(threadid)
    }
};
export default handleRequest;

