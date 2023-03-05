

import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { getSessionLayout, getUserLayout, getChannelConfig } from "../../../../lib/db/config"
import { dbLog, dbEnd } from "../../../../lib/db"
import { processLayout } from "../../../../lib/layout"
import { fetchQueue } from "../../../../lib/queue/fetchQueue"
import { processPostBody } from '../../../../lib/processPostBody';

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

    let { newsline, forum, tag, userslug, sessionid, type, countonly, lastid, tail, page, test, qwiketid, size, solo, debug } = req.query;
    if (!countonly)
        countonly = '0';
    if (!tail)
        tail = '0';
    if (!page)
        page = '0';
    if(+(size||'0')==0)
    size='4';

    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
    if (!redis)
        return res.status(500).json({ msg: "Unable to create redis" })


    const countOnlyParam = +countonly;
    const tailParam = +tail;
    const pageParam = +page; 
    try {
        // l(chalk.magenta.bold("fetchQueue", js({newsline,forum,lastid,type, tag, page,countonly})))
        let ret:any= await fetchQueue({ type, newsline, forum, tag, lastid, firstid: 0, page: pageParam, sessionid, countonly: countOnlyParam, userslug, tail: tailParam, qwiketid, size, solo, test, debug, threadid, redis })
        ret.type=type;
        // l('ret:',js(ret))
        if (!countonly || (countonly == '0')) {
            const items = ret.items;
            // if(type=='mix')
            // l('ret',js({count:items.length,tail:ret.tail,firstItem:items[0]}))
            //   l("ret:", ret.items.map(r=>r.item))
            const newItems = items.filter((p: any) => p != null).map(({ item }: any) => {
                if (!item)
                    return null;
                    if(type=='reacts')
                l("item after filter",js(item))
                /* if (!item.catIcon) {
                     l(chalk.red.bold("=========================<>>>>   NO CAT ICON",item))
                 }*/
                //  l(1111)
                const isPost = item.qpostid ? true : false;
                // l(11222,isPost)

                let processedBody = item.body;
                if (isPost) {
                    //l(chalk.yellow.bold("POST:", js(item.body)))
                    processedBody = processPostBody(item.body)
                    // l(chalk.yellow.bold("POST2:", js(processedBody)))
                }

                let common: any = {
                    catName: isPost ? item.cat_name : item.catName,
                    catIcon: isPost ? item.cat_icon : item.catIcon,
                    postBody: processedBody,
                    qpostid: item.qpostid ? item.qpostid : '',
                    published_time: item.published_time,
                    shared_time: item.shared_time,
                    slug: item.threadid,
                    title: item.title,
                    site_name: item.site_name,
                    url: item.url,
                    description: item.description,
                    author: item.author,
                    image: item.image,
                    tag: isPost ? item.category : item.cat,
                }
                //  if(type=='mix'&&isPost)
                //  console.log("mix item",js({isPost,title:common.title,postBody:common.postBody}))
                if (isPost) {
                    common['author_username'] = item.username;
                    common['author_avatar'] = item.author_avatar;
                    common['author_name'] = item.author_name;
                    common['thread_title'] = item.title;
                    common['thread_url'] = item.thread_url;
                    common['thread_image'] = item.thread_image;
                    common['thread_author'] = item.thread_author;
                    common['createdat'] = item.createdat;
                    common['subscr_status'] = item.subscr_status;
                    common['id'] = item.id;



                }
                if(type=='reacts'){
                    l(chalk.yellow("returning common",js(common)))
                }
                return common;

            })
            // l(newItems)
            ret.items = newItems.filter((p: any) => p != null);
            // if(type=='mix')
            //l(chalk.green.bold("return from fetchQueue", js(ret)))
        }
        // if (type == 'mix')
        //  l(chalk.magenta.bold(js(ret)))
        if (countonly) {
            // console.log('count:',ret.newItems)
        }

        // l(chalk.cyan.bold("444",js(ret)))
        res.status(200).json(ret)
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
