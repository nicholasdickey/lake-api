//./pages/api/v1/sitemap/fetch.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { dbEnd } from "../../../../lib/db"
import { getRssNewsline } from "../../../../lib/db/qwiket"
import { formatISO, format as ff, addDays, parseISO, sub } from 'date-fns'
import fetchAll from "../../../../lib/fetch-all"

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

    const { newsline, startDate, format, domain, forum } = req.query;
    let dateStart = parseISO(startDate as string);
    let dateEnd = sub(addDays(dateStart, 7), { seconds: 1 });
    const timeStart = dateStart.getTime() / 1000 | 0;
    const timeEnd = dateEnd.getTime() / 1000 | 0;
    l(chalk.green("sitemap", js({ newsline, startDate, format, timeStart, timeEnd })))
    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
    if (!redis)
        return res.status(500).json({ msg: "Unable to create redis" })
    try {
        const allPublications = await fetchAll({ redis, threadid, sessionid: '', userslug: '', newsline: newsline as string, filters: [] })
        const key = `'${allPublications?.map(p => p.tag).join(`','`)}'`
        const range = await getRssNewsline({ threadid, key, timeStart, timeEnd });
        console.log("range", js(range))

        if (format == 'xml') {
            const sitemap = range.map((m: any) => `<url><loc>https://${domain}/${forum}/topic/${m.tag}/${m.threadid}</loc><lastmod>${ff(new Date(m.shared_time * 1000), 'yyy-MM-dd')}</lastmod></url>`).join('\r\n');
            const fullFile = `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${sitemap}</urlset>`;
            console.log(chalk.green(fullFile))
            return res.status(200).json({ success: true, sitemap: fullFile })
        }
        else {
            const sitemap = range.map((m: any) => `https://${domain}/${forum}/topic/${m.tag}/${m.threadid}`).join('\r\n');
            return res.status(200).json({ success: true, sitemap})
        }      
    }
    catch (x) {
        l(chalk.red.bold(x))
        res.status(501).json(x);
    }
    finally {
        await redis.quit();
        dbEnd(threadid);
    }
}
