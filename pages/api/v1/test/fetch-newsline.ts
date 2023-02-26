

import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { dbEnd, dbGetQuery, dbLog } from "../../../../lib/db";
type Data = any

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    await NextCors(req, res, {
        // Options
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
        origin: '*',
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    let threadid = Math.floor(Math.random() * 100000000)

    try {
        let sql, rows;
        let query = await dbGetQuery("povdb", threadid);
        sql = `SELECT * FROM povdb.pov_threads_view6 where category_xid in (SELECT DISTINCT c.xid from povdb.pov_v30_newsline_default_tags dt, pov_categories c where c.shortname=dt.tag and newsline='qwiket')  order by published_time desc , shared_time desc limit 100`;
        rows = await query(sql);
   //     l(js({success:true,rows}))
        res.status(200).json({success:true,rows})
    }

    catch (x) {
        l(chalk.red.bold(x));
        res.status(501).json({success:false})
    }
    finally{
        dbEnd(threadid);
    }

}
