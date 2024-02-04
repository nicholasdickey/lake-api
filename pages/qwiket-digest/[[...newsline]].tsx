
import React from "react"
import {
    GetServerSidePropsContext,
    GetServerSidePropsResult,

} from "next";

import { findexCalc,getChannelItems,getLeagueItems } from '../../lib/functions/dbservice';
import encodeEntities from '../../lib/encode-entities';
import removeHashtags from '../../lib/remove-hashtags';

import { dbEnd } from '../../lib/db';
import { l, chalk, allowLog,microtime } from '../../lib/common';
import { getRedisClient } from "../../lib/redis"
export default async function Home() {

    return <div><div></div></div>;
}


function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c: string): string => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            case "'": return '&quot;';
        }
        return "";
    });
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
   // console.log("rss context", context);
    allowLog();
    let threadid = Math.floor(Math.random() * 100000000);
    try {
        const redis = await getRedisClient({});
       
        if(redis){
        let findexTimestamp=+(await redis.get('findex-timestamp')||0);
        let m=microtime();
       /* let interval=m-findexTimestamp;
            if(interval>1000*60*60){
                await findexCalc({ threadid});
                await redis.set('findex-timestamp',m);
            }*/
        }
        let ns=context.params?.newsline;
        if(ns && typeof ns === 'object'){
            ns=ns[0];
        }
        let newsline: string = ns as string || process.env.DEFAULT_NEWSLINE || "";
        if (!newsline)
            process.env.DEFAULT_NEWSLINE
      //  console.log("FEED:", { newsline, context: context.params })
      
        //  const rssNewsline = `rss-${newsline || process.env.DEFAULT_NEWSLINE}`;



        //  const key: FetchQueueKey["key"] = ['queue', type, newsline, 0, forum, '', 0, '0', '', '', 0, '', '', 12];
        // console.log("rss key==", key)
       
        let items = await getLeagueItems({ league: newsline, threadid });
    //    l("after items", items)
        if (context.res) {
            const header = `<?xml version="1.0" encoding="UTF-8" ?>  
    <rss version="2.0"> 
      <channel> 
        <title>${newsline}</title> 
        <link>https://qwiket.com</link> 
        <description>Qwiket RSS League Feed for ${newsline} </description>
      `;


            const rssItems = items.map((p: any, itemCount: number) => {
                try {
                    //  console.log("rss item:", JSON.stringify(p))
                    // const isDigest = p.title.indexOf('Digest') >= 0;
                    //   if (isDigestFeed && !isDigest)
                    //       return;

                    //  const date = p.processedTime;// .shared_time;
                    //const url = p.url;
                    const url=`https://www.qwiket.com/pub/league/${newsline.toLowerCase()}?story=${p.slug}&utm_content=qwiket-digest`
                    // const image=p.image;
                    // if (!date || date == "null") return;
                    // console.log("RSS date ",date);



                    /* if (date > cdate - 600)
                         // delay by 10 minutes
                         return;*/
                    if (itemCount++ > 100) return;
                   // l("rss item", p);
                    const d = new Date(p.createdTime);
                  //  l(chalk.yellow("time:", d))
                    const isoDate = new Date(p.createdTime).toISOString();
                    let flink = `${url}`;
                    let { digest, title,slug } = p;
                    //   const descrParts = description.split("{ai:summary}");
                    //  description - descrParts[0];
                    // let summary = descrParts.length > 1 ? descrParts[1] : '';
                    //digest = digest.replaceAll('<p>', '<p>').replaceAll('</p>', '</p>\n\n').replaceAll('()', '');
                    //description=description.replaceAll('"', '&#34;').replaceAll("'", '&#39;').replaceAll("&", '&#38;');
                    //summary=summary.replaceAll('"', '&#34;').replaceAll("'", '&#39;').replaceAll("&", '&#38;');
                    digest = removeHashtags(digest);
                    digest = escapeXml(digest);
                    digest = digest.replaceAll('<p>', '').replaceAll('</p>', '').replaceAll('()','').replaceAll('(,)','');
                 
                    if (p.hashtag && p.hashtag.length > 0){
                        const hashtags=p.hashtag.split(' ').map((word:string) => `#${word}`).join(' ');
                        digest = `${hashtags} ${digest}`;
                    }
                    title = escapeXml(title);
                  //  flink = flink.split('?')[0];
                  //  console.log("################# DIGEST summary", digest)
                    return `
        <item>
            <link>${flink}</link>
            <title>${title}</title>
            <pubDate>${isoDate}</pubDate>  
            <description>${digest}</description>
          
        </item>
        `
                }
                catch (x) {
                    console.log("Exception in rssItems", x)
                    context.res.statusCode = 503;
                    return {
                        props: { error: 503 }
                    }

                }
            })
            const rss = rssItems.filter((p: any) => p ? true : false)
            const all = `${header}${rss.join('\n')} </channel>
    </rss>`
          //  console.log("NEAR END")
            context.res.setHeader('Content-Type', 'text/xml');
            context.res.write(all);
            context.res.end();
        }
        return { props: {} };
    }
    catch (x) {
        console.log("Exception in rss", x)
        context.res.statusCode = 503;
        return {
            props: { error: 503 }
        }

    }
    finally {
        await dbEnd(threadid);
    }
}
