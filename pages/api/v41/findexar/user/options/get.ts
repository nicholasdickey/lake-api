import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep } from "../../../../../../lib/common";
import { getUserOptions,checkFreeUser } from "../../../../../../lib/functions/dbservice";
import { dbEnd } from "../../../../../../lib/db"


const handleRequest = async (req: NextApiRequest, res: NextApiResponse) => {
    await NextCors(req, res, {
        // Options
        methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
        origin: "*",
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });
    let threadid = Math.floor(Math.random() * 100000000);
    try {
        const t1=Date.now();
        let { userid,api_key,email} = req.query;
        if(api_key!=process.env.LAKE_API_KEY){
            return res.status(401).json({ success: false ,message:"Invalid api_key",exists:false});
        }
        const exists=await checkFreeUser({ threadid,email:email as string||""});
        //l("exists:",{exists,email,userid})
        const options=await getUserOptions({ threadid,userid:userid as string||"",email:email as string||""});
        //l("options:",{options})
        const t2=Date.now();
        l(chalk.green("getUseOptions"),js({elapsed:t2-t1}));
        return res.status(200).json({ success: true,exists,options});
    }
    catch(x){
        console.log("Error in getDetails:", x);
        return res.status(500).json({ success: false });
    }    
    finally {    
        dbEnd(threadid)
    }
};
export default handleRequest;

