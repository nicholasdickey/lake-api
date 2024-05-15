import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { l, chalk } from "@/lib/common";
import { initRostersCache } from "@/lib/functions/qwiket-cache";

const handleInitCache = async (req: NextApiRequest, res: NextApiResponse) => {
    await NextCors(req, res, {
        methods: ["GET", "POST"],
        origin: "*",
        optionsSuccessStatus: 200,
    });

    let threadid = Math.floor(Math.random() * 100000000);
    try {
        let { userid="" } = req.query as { userid: string };

        if (!userid) {
            return res.status(400).json({ success: false, message: "Missing userid" });
        }

      //  l(chalk.green("Initializing cache for rosters"));
        await initRostersCache(threadid, userid, false);
        res.status(200).json({ success: true, message: "Cache initialization successful" });
    } catch (error) {
        console.error("Error in initializing cache:", error);
        res.status(500).json({ success: false, message: "Cache initialization failed" });
    }
};

export default handleInitCache;


