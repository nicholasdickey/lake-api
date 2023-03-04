

import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { dbLog, dbEnd } from "../../../../lib/db"
import { getRssNewsline } from "../../../../lib/db/qwiket"
import { formatISO, addDays, parseISO, sub } from 'date-fns'
import fetchAll from "../../../../lib/fetchAll"
type Data = any

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    await NextCors(req, res, {
        // Options
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        origin: '*',
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    let { newsline, forum,domain } = req.query;
    const startDate = '2023-01-29T00:00:00';
    let dateStart = parseISO(startDate as string)

    const now = Date.now();
    let sitemaps = [];
    let count=0;
    if(!domain)
        domain='am1.news';
    while (true) {

        let sitemap= `https://${domain}/sitemap_${newsline}_${forum}_${formatISO(dateStart)}`;
        sitemap= sitemap.substring(0, sitemap.length - 1);
        sitemaps.push(sitemap);
        dateStart = addDays(dateStart, 7);
        if (dateStart.getTime() > now)
            break;
        if(count++>1000)
            break;    
    }

    res.status(200).json({ success: true, sitemaps })




}
