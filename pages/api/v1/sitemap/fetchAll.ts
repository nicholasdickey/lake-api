//./pages/api/v1/sitemap/fetchAll.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { formatISO, addDays, parseISO, sub } from 'date-fns'


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<any>
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
    return res.status(200).json({ success: true, sitemaps })
}
