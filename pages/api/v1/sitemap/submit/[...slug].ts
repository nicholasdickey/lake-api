//./pages/api/v1/submit/[...slug].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../../lib/common";
import { getRedisClient } from "../../../../../lib/redis"
import { dbEnd } from "../../../../../lib/db"
import { getPublicationNewslines, getNewslineForumAndDomain } from "../../../../../lib/db/newsline"
import { submitCurrentSitemap } from "../../../../../lib/google/submit-current-sitemap"
import { indexUrl } from "../../../../../lib/google/index-url"
const { getISODay, addDays, startOfDay, formatISO } = require("date-fns");


function getDayInPast(targetISODay: number, fromDate = startOfDay(new Date())) {
    //7-Sunday,1-Monday -- ISO
    const fromISODay = getISODay(fromDate);
    if (fromISODay == targetISODay) {
        const res = formatISO(fromDate)
        return res.substring(0, res.length - 1); // remove Z
    }

    // targetISODay >= fromISODay means we need to trace back to last week
    // e.g. target is Wed(3), from is Tue(2)
    // hence, need to -7 the account for the offset of a week
    const offsetDays =
        targetISODay >= fromISODay
            ? -7 + (targetISODay - fromISODay)
            : targetISODay - fromISODay;
    console.log(js({ fromDate, offsetDays, fromISODay }))
    const res = formatISO(startOfDay(addDays(fromDate, offsetDays)))
    return res.substring(0, res.length - 1);
}


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<any>
) {
    await NextCors(req, res, {
        // Options
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
        origin: '*',
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });
    let threadid = Math.floor(Math.random() * 100000000);
    const redis = await getRedisClient({});
    if (!redis)
        return res.status(500).json({ msg: "Unable to create redis" })
    try {
        const params = req.query?.slug as string[];
        const [tag, slug] = params || ['', '',];
        /**
         * Now need to get domain / newsline / forum
         * 1. Get tag/newsline from pov_30_publications
         * 2. Get the row from pov_30_forums for channel=newsline
         */
        const newslineObjs = await getPublicationNewslines({ threadid, tag });

        newslineObjs.forEach(async ({ newsline }) => {
            const { forum, domain } = await getNewslineForumAndDomain({ threadid, newsline }) || { forum: 'escape', domain: 'qwiket.com' }
            const date = getDayInPast(7);
            const sitemapName = `sitemap_${newsline}_${forum}_${date}`
            const url=`https://${domain}/${forum}/topic/${tag}/${slug}`;

            //1. Add directly to GOOGLE index
            //2. Resubmit current sitemap
            //   2.1 Construct the last Sunday ISO date
            await indexUrl(url);

            await submitCurrentSitemap(sitemapName,domain);
            res.status(200).json({ success: true, date })
        })
    }
    catch (x) {
        l(chalk.red.bold(x));
        res.status(501).json({ success: false })
    }
    finally {
        await redis.quit();
        dbEnd(threadid);
    }
}
