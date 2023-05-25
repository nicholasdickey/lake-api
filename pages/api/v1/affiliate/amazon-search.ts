//@ts-ignore 
import cheerio from "whacko"
import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next"
import NextCors from 'nextjs-cors';
import { getRedisClient } from "../../../../lib/redis";
import { l, chalk, js, sleep,allowLog } from "../../../../lib/common";
allowLog();
function truncateString(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength) + '...';
  }
  
export default async (
    req: NextApiRequest,
    res: NextApiResponse) => {

    await NextCors(req, res, {
        // Options
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
        origin: '*',
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    let search:string = req.query.search as string;
    const url=`https://www.amazon.com/s?k=${encodeURIComponent(search)}&ref=nb_sb_noss_2`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const results = $('.s-result-item');
    interface Item {
        title: string;
        price: string;
        image: string;
        link: string;
    }
    let items = new Array<Item>();
    results.each((i:any, el:any) => {
        const title = truncateString( $(el).find('h2').text(),96);
        const price = $(el).find('.a-price-symbol').text()+$(el).find('.a-price-whole').text()+$(el).find('.a-price-fraction').text();
        const image = $(el).find('img').attr('src');
        const link = `https://amazon.com`+$(el).find('a').attr('href')+'&tag=qwiket-20';
        items.push({ title, price, image, link });
        l(chalk.bgGreenBright.whiteBright(js({ title, price, image, link })));
    });
    // remove items over 3
   
    items=items.filter(i=>i.title && i.price && i.image && i.link);
    items=items.slice(0,4);
    return res.status(200).json({ items })
}