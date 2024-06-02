import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk, js, sleep } from "../../../../../lib/common";
import { updateUserSubscription } from "../../../../../lib/functions/dbservice";
import { dbEnd } from "../../../../../lib/db"

const handleRequest = async (req: NextApiRequest, res: NextApiResponse) => {
    await NextCors(req, res, {
        // Options
        methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
        origin: "*",
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });
    let threadid = Math.floor(Math.random() * 100000000);
    try {
        let { userId, api_key, subscriptionId = "", level = '0', email = "" } = req.method === "POST" ? req.body : req.query;
        userId = userId || "";
        email = email || "";
        if (api_key != process.env.LAKE_API_KEY) {
            return res.status(401).json({ success: false });
        }
        await updateUserSubscription({ threadid, userId, subscriptionId, level, email });
        return res.status(200).json({ success: true });
    } catch (x) {
        console.log("Error in handleRequest:", x);
        return res.status(500).json({ success: false });
    } finally {
        dbEnd(threadid);
    }
};
export default handleRequest;

