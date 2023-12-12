
import React from "react"
import {
    GetServerSidePropsContext,
    GetServerSidePropsResult,

} from "next";

import { getChannelItems ,getOutfeedItems} from '../../lib/functions/dbservice';
import encodeEntities from '../../lib/encode-entities';
import removeHashtags from '../../lib/remove-hashtags';

import { dbEnd } from '../../lib/db';
import { l, chalk, allowLog } from '../../lib/common';

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
    console.log("rss context", context);
    allowLog();
    let threadid = Math.floor(Math.random() * 100000000);
    try {
        let newsline: string = context.params?.newsline as string || process.env.DEFAULT_NEWSLINE || "";
        if (!newsline)
            process.env.DEFAULT_NEWSLINE
        console.log("FEED:", { newsline, context: context.params })
        //  const rssNewsline = `rss-${newsline || process.env.DEFAULT_NEWSLINE}`;



        //  const key: FetchQueueKey["key"] = ['queue', type, newsline, 0, forum, '', 0, '0', '', '', 0, '', '', 12];
        // console.log("rss key==", key)
        let items = await getOutfeedItems({ outfeed: newsline, threadid });
        l("after items", items)
        if (context.res) {
            const header = `<?xml version="1.0" encoding="UTF-8" ?>  
    <rss version="2.0"> 
      <channel> 
        <title>Long Feed ${newsline}</title> 
        <link>https://findexar.com</link> 
        <description>Findexar RSS Feed for ${newsline}</description>
      `;


            const rssItems = items.map((p: any, itemCount: number) => {
                try {
                    //  console.log("rss item:", JSON.stringify(p))
                    // const isDigest = p.title.indexOf('Digest') >= 0;
                    //   if (isDigestFeed && !isDigest)
                    //       return;

                    //  const date = p.processedTime;// .shared_time;
                    const url = p.url;
                    // const image=p.image;
                    // if (!date || date == "null") return;
                    // console.log("RSS date ",date);



                    /* if (date > cdate - 600)
                         // delay by 10 minutes
                         return;*/
                    if (itemCount++ > 100) return;
                    l("rss item", p);
                    const d = new Date(p.createdTime);
                    l(chalk.yellow("time:", d))
                    const isoDate = new Date(p.createdTime).toISOString();
                    let flink = `${url}`;
                    function extractDomain(url: string): string | null {
                        try {
                            const parsedUrl = new URL(url);
                            return parsedUrl.hostname;
                        } catch (error) {
                            console.error("Invalid URL:", error);
                            return null;
                        }
                    }
                    const domain = extractDomain(url);

                    let { longdigest: digest, title } = p;
                    if (!digest)
                        return null;
                    //   const descrParts = description.split("{ai:summary}");
                    //  description - descrParts[0];
                    // let summary = descrParts.length > 1 ? descrParts[1] : '';
                    // digest = digest.replaceAll('<p>', '<p>').replaceAll('</p>', '</p>\n\n').replaceAll('()', '');
                    //description=description.replaceAll('"', '&#34;').replaceAll("'", '&#39;').replaceAll("&", '&#38;');
                    //summary=summary.replaceAll('"', '&#34;').replaceAll("'", '&#39;').replaceAll("&", '&#38;');
                    digest = removeHashtags(digest);
                    digest = `${digest} ${domain}`
                    l(chalk.yellow("digest", digest))
                    digest = escapeXml(digest);
                    digest = digest.replaceAll('<p>', '<p>').replaceAll('</p>', '</p>\n\n').replaceAll('()','').replaceAll('(,)','');
                  
                    l(chalk.yellow("escaped digest", digest))
                    if (p.hashtag && p.hashtag.length > 0){
                        const hashtags=p.hashtag.split(' ').map((word:string) => `#${word}`).join(' ');
                        digest = `${hashtags} ${digest}`;
                    }
                       
                    title = escapeXml(title);
                    flink = flink.split('?')[0];

                    console.log("################# DIGEST summary", title, digest)
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
            console.log("NEAR END")
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
