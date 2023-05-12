import type { NextApiRequest, NextApiResponse } from "next";
import { Configuration, OpenAIApi, ChatCompletionRequestMessage, CreateChatCompletionResponse } from "openai";
import NextCors from 'nextjs-cors';
import digest from '../../../../lib/openai/submit-digest';
import generateLabel from '../../../../lib/openai/generate-label';
import {checkDigest,insertDigest} from '../../../../lib/db/digest';


const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    await NextCors(req, res, {
        // Options
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
        origin: '*',
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });
    let threadid = Math.floor(Math.random() * 100000000);
    let { newsline, minutes } = req.query;

    // l(chalk.green('comment.ts: slug:', slug, 'postid:', postid))
    if (!newsline || !minutes)
        return res.status(403).json({ error: 'missing newsline or minutes' });
    const label=generateLabel();
    const combinedLabel=`${label.date}-${label.timeIndex}`;
    const r=await checkDigest({threadid,label:combinedLabel})
    if(r){
        console.log("digest already exists");
        return res.status(200).json({success:false,msg:'digest already exists'});
    }
    console.log("calling insertDigest");
    await insertDigest({threadid,label:combinedLabel}); 
    console.log("calling insertDigest2"); 
    
    const ret=await digest({newsline:newsline as string,minutes:+minutes})  
    res.status(200).json(ret);

}