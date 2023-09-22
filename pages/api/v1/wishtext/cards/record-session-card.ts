
// ./pages/api/v1/channel/fetch.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../../lib/common";
import {  dbEnd } from "../../../../../lib/db"
import {recordSessionCard} from "../../../../../lib/db/wishtext"
import CardData from "../../../../../lib/types/card-data";
//import sharp from "sharp";
const puppeteer = require('puppeteer');
/*const resizeBase64 = async ({ base64Image, height = 640, width = 640 }:{base64Image:string,height:number,width:number}) => {
    const destructImage = base64Image.split(";");
    const mimType = destructImage[0].split(":")[1];
    const imageData = destructImage[1].split(",")[1];
  
    try {
      let resizedImage = Buffer.from(imageData, "base64")
      resizedImage = await sharp(resizedImage).resize({ width,height,fit:'contain',background:{r: 164, g: 164, b: 164, alpha: 0.5} }).toBuffer()
      
      return `data:${mimType};base64,${resizedImage.toString("base64")}`
    } catch (error) {
      throw({ error })
    }
  };
*/
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

    let { sessionid=''} = req.query;
    const body=req.body;
    const {card}:{card:CardData,sessionid:string}=body;
   // const rb =await  resizeBase64({base64Image:card.metaimage||'',height:428,width:1200});
    card.metaimage="";
    let threadid = Math.floor(Math.random() * 100000000)
    try{
        l(chalk.yellowBright("recordSessionCard API>",card));
    const {cardNum,linkid}= await recordSessionCard({threadid, sessionid: sessionid as string,card});  
    
    l(chalk.yellowBright("after recordSessionCard API>",linkid));  
    const browser = await puppeteer.launch();
	const page = await browser.newPage();
	await page.goto(`https://dev.qwiket.com/view/${linkid}.gif&create=true`, {waitUntil: 'networkidle2'});
	
	await browser.close();
    l(chalk.green("After puppeteer"));    
    const ret = linkid?{
            success: true,
            cardNum,
            linkid
        }:{
            success: false,
            msg: "Unable to  recordSessionCard for sessionid:", sessionid
        }
        res.status(200).json(ret)
    }
    catch (x) {
        l(chalk.red.bold(x));
        res.status(501).json(x);
    }
    finally {
     
        dbEnd(threadid);
        return res.status(500);
    }
}
export const config = {
    api: {
        responseLimit: false,
      },
      bodyParser: {
        sizeLimit: '8mb',
      },  
}
