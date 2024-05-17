//./pages/api/v1/submit/[...slug].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../../../lib/common";

import { dbEnd } from "../../../../../../lib/db"
import { submitCurrentSitemap } from "../../../../../../lib/google/submit-findexar-sitemap"
import { indexUrl } from "../../../../../../lib/google/index-url"

const { getISODay, addDays, startOfDay, formatISO } = require("date-fns");
import { getSlugLeagues } from "../../../../../../lib/functions/dbservice";


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
  
    try {
        const params = req.query?.slug as string[];
        let [slug] = params || ['',];
        const domains = ['www.findexar.com', 'www.qwiket.com'];

        const leagues = await getSlugLeagues({ threadid, slug });
        const date = getDayInPast(7);
        domains.forEach(async (domain) => {
            console.log("process domain",domain,leagues,slug)
            leagues.forEach(async (league: string) => {
                console.log("process league",domain,leagues,slug)
                const url = `https://${domain}/${league}?story=${slug}`;
                const sitemapName = `${date}`
                console.log("sitemap url", url, sitemapName,domain,league);
                await indexUrl(url);
                await submitCurrentSitemap(sitemapName, domain,league);
                try{
                    let urlCache = `https://lake-api.qwiket.com/api/v50/findexar/user/get-stories?league=${league}&force=1`;
                    await fetch(urlCache);
                    urlCache=`https://lake-api.qwiket.com/api/v41/findexar/get-slug-story?slug=${slug}`;
                    //urlCache = `https://lake-api.qwiket.com/api/v41/findexar/user/fetch-stories?league=${league}&force=1`;
                    await fetch(urlCache);
                }
                catch(x){
                    console.log("Error in fetch-stories:", x);
                }

            })
        })
        const urlCache = `https://lake-api.qwiket.com/api/v41/findexar/user/fetch-stories?force=1`;
        try{
            await fetch(urlCache);
        }   
        catch(x){
            console.log("Error in fetch-stories:", x);
        }

        return res.status(200).json({ success: true, date })
        /**
         * Now need to get domain / newsline / forum
         * 1. Get tag/newsline from pov_30_publications
         * 2. Get the row from pov_30_forums for channel=newsline
         */
    }
    catch (x) {
        l(chalk.red.bold(x));
        res.status(501).json({ success: false })
    }
    finally {
        dbEnd(threadid);
    }
}
