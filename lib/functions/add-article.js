import { l, chalk, microtime, js, ds,uxToMySql } from "../common.js";
import getAndParse from "./get-and-parse.js";
import {saveChannelItem} from './dbservice';
import createDigest from './digest';

const addArticle = async (url,channel,threadid) => {
    const returnObject =await getAndParse(url);
    l(chalk.green("After get and parse", url, js(returnObject)));
    await saveChannelItem({...returnObject,url,channel,threadid});
    const digest=await createDigest(returnObject.body);
    l(chalk.yellowBright("digest",digest));
    await saveChannelItem({...returnObject,digest,url,channel,threadid});
    return;
}
export default addArticle;


