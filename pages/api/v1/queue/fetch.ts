

import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { getSessionLayout, getUserLayout, getChannelConfig } from "../../../../lib/db/config"
import { dbLog, dbEnd } from "../../../../lib/db"
import { processLayout } from "../../../../lib/layout"
import { fetchQueue } from "../../../../lib/fetchQueue"
import { Commissioner } from '@next/font/google';
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

    let { newsline, forum, tag, userslug, sessionid, type, countonly, lastid, page, test } = req.query;

    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
    if (!redis)
        return res.status(500).json({ msg: "Unable to create redis" })

    try {
     l(chalk.magenta.bold("fetchQueue", js({lastid,type, tag,countonly})))
        let ret = await fetchQueue({ type, newsline, forum, tag, lastid, firstid: 0, page, sessionid, countonly, userslug, test })
        if (!countonly) {
            const items = ret.items;
           // if(type=='mix')
           // l("ret:", ret.items.map(r=>r.item))
            const newItems = items.map(({ item }: any) => {
               /* if (!item.catIcon) {
                    l(chalk.red.bold("=========================<>>>>   NO CAT ICON",item))
                }*/
                const isPost=item.qpostid?true:false;
                let common:any={
                    catName: isPost?item.cat_name:item.catName,
                    catIcon: isPost?item.cat_icon:item.catIcon,
                    postBody:item.body,
                    qpostid:item.qpostid?item.qpostid:'',
                    published_time: item.published_time,
                    shared_time: item.shared_time,
                    slug: item.threadid,
                    title: item.title,
                    site_name: item.site_name,
                    url: item.url,
                    description: item.description,
                    author: item.author,
                    image: item.image,
                    tag: isPost?item.category:item.cat,
                }
                if(isPost){
                    common['author_username']=item.username;
                    common['author_avatar']=item.author_avatar;
                    common['author_name']=item.author_name;
                    common['thread_title']=item.thread_title;
                    common['thread_url']=item.thread_url;
                    common['thread_image']=item.thread_image;
                    common['thread_author']=item.thread_author;
                    common['createdat']=item.createdat;
                    common['subscr_status']=item.subscr_status;

                }
                return common;

            })
           // l(newItems)
            ret.items = newItems;
           // l(chalk.green.bold("return from fetchQueue", js(ret)))
        }
       // if (type == 'tag')
        //    l(chalk.magenta.bold(js(ret)))
        if(countonly){
            console.log('count:',ret.newItems)
        }
        res.status(200).json(ret)
    }

    catch (x) {
        l(chalk.red.bold(x))
        redis.quit();
        dbEnd(threadid);
    }

}
