import { l, chalk, microtime, js, ds,uxToMySql } from "../../common.js";
import * as cheerio from 'cheerio';

import main from './main.js';

const rules=async (html,url)=>{
    const $ = cheerio.load(html);
    const title=$('title').first().text().trim();
    let body=(await main($,url));
    if(body){
        body=body.trim();
       // l(chalk.green("body", body))
    }
    else {
        l(chalk.redBright("body is null",html))
    }
    //l(chalk.green("body", body))
    return {body,title};

}
export default rules;