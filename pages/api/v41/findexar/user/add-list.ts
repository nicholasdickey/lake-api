import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep } from "../../../../../lib/common";
import { addUserList } from "../../../../../lib/functions/dbservice";
import { dbEnd } from "../../../../../lib/db"


const handleRequest = async (req: NextApiRequest, res: NextApiResponse) => {
    console.log("WWWWWWWWWWWWW")
    await NextCors(req, res, {
        // Options
        methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
        origin: "*",
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });
    let threadid = Math.floor(Math.random() * 100000000);
    try {
        let { userId,api_key,name,description} = req.query;
        if(api_key!=process.env.LAKE_API_KEY){
            return res.status(401).json({ success: false });
        }
        console.log("add-list",name,description)
        const lists=await addUserList({ threadid,userId:userId as string||"",name:name as string||"",description:description as string||""});
        const retLists=lists.map((list:any)=>{
            return {listxid:list.listxid,name:list.name,description:list.description}
        });
        console.log("add-list returning:",retLists)
        return res.status(200).json({ success: true,lists:retLists});
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

