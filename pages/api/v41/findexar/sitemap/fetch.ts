//./pages/api/v1/sitemap/fetch.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../../lib/common";
import { dbEnd } from "../../../../../lib/db"
import { formatISO, format as ff, addDays, parseISO, sub } from 'date-fns'
import { fetchLeagueStorySlugs } from "../../../../../lib/functions/dbservice";


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
    const { league, startDate, format, domain } = req.query;
    let dateStart = parseISO(startDate as string);
    let dateEnd = sub(addDays(dateStart, 7), { seconds: 1 });
    const timeStart = dateStart.getTime() / 1000 | 0;
    const timeEnd = dateEnd.getTime() / 1000 | 0;
   // l(chalk.green("sitemap", js({ newsline, startDate, format, timeStart, timeEnd })))
    let threadid = Math.floor(Math.random() * 100000000)
    try {
        const slugs=await fetchLeagueStorySlugs({ threadid, league:league as string, timeStart, timeEnd });

        if (format == 'xml') {
            const sitemap = slugs.map((m: any) => `<url><loc>https://${domain}.com/pub/${league}?story=${m.slug}&utm_content=sitemap</loc><lastmod>${ff(m.createdTime, 'yyy-MM-dd')}</lastmod></url>`).join('\r\n');
            const fullFile = `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${sitemap}</urlset>`;
           // console.log(chalk.green(fullFile))
            return res.status(200).json({ success: true, sitemap: fullFile })
        }
        else {
            const sitemap = slugs.map((m: any) => `https://${domain}.com/pub/${league}?story=${m.slug}&utm_content=txt_sitemap`).join('\r\n');
            return res.status(200).json({ success: true, sitemap})
        }      
    }
    catch (x) {
        l(chalk.red.bold(x))
        res.status(501).json(x);
    }
    finally {
        dbEnd(threadid);
    }
}
