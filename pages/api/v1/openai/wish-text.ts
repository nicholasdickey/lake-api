import type { NextApiRequest, NextApiResponse } from "next";
import { Configuration, OpenAIApi, ChatCompletionRequestMessage } from "openai";
import NextCors from "nextjs-cors";
import { getRedisClient } from "../../../../lib/redis";
import { l, chalk, js, sleep } from "../../../../lib/common";
import { recordEvent,recordSessionHistory,checkSessionHistory } from "../../../../lib/db/wishtext";
import { dbEnd } from "../../../../lib/db"
import applyRateLimit from '../../../../lib/rate-limit';
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const handleRequest = async (req: NextApiRequest, res: NextApiResponse) => {
  await NextCors(req, res, {
    // Options
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    origin: "*",
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  });
  try {
    await applyRateLimit(req, res)
  } catch {
    return res.status(429).send('Too many requests')
  }
  let threadid = Math.floor(Math.random() * 100000000);

  const redis = await getRedisClient({});
  try {
    console.log("wish-text called");
    let { sessionid, from, to, occasion, naive,reflections, instructions, inastyleof, language, age, fresh, recovery } = req.query;
    console.log("req.query", req.query);
    const lighthearted=naive=='false'?true:false; 
    console.log('lighthearted==>',lighthearted)
    const text = `Generate ${inastyleof ? `in a style of ${inastyleof}` : ""
      } a wish message on occasion of ${occasion
     // } ${occasion == "Birthday" ? `` : ""
      } The message is from ${from ? from : ""} ${to ? "to " + to : ""
      } ${reflections ? "also consider the following thoughts '" + reflections + "'" : ""
      } ${instructions ? "Additional instructions:'" + instructions + "'." : `Keep it very hallmark like, casual, very terse and acerbic, free of sloganeering, banalities, "let's", etc. Keep it real and casual, like the real people talk.`} Keep it around 400 characters unless instructed otherwise.Output in JSON format {headline,body, tags}.Tags is a comma separated string of tags selected from this set [christmas, thanksgiving,easter,julyfourth,sad,melancholy,cheerful,congratulations,birthday,getwell,love,holiday,winter,fall,summer,spring,anniversary,wedding,mood,travel,greeting,friendship]. Only tags from this set should be included. The tags should reflect the theme and the mood of the main message and will be used to select appropriate image. Output text as github markdown. ${lighthearted?"Make it hallmark humorous, if possible. Use many emojis.":""} Do not add any meta information, like character count. No hashtags.${language ? "Use language:" + language : ""}`;
    
    console.log("Full text:", text);
    const k = sessionid + text;
    const isFresh = fresh == "1";
    const isRecovery = recovery == "1";
    let assistantMessages: ChatCompletionRequestMessage[] = [];
    let additionalInstructions: string = '';
    try {
      const history=await checkSessionHistory({sessionid:sessionid as string,threadid,occasion:occasion as string});
      if (!history) {
        console.log("fetching from redis isFresh:", isFresh);
        const cachedResult = await redis?.get(text);
        console.log("cachedResult:", cachedResult);

        if (cachedResult) {
          console.log("cachedResult:", cachedResult);
          await recordEvent({ threadid, sessionid: "API=>"+process.env.event_env + ":" + (sessionid as string || ""),sid:sessionid as string||'', params: ""+k+";conent:"+cachedResult, name: "cachedGreetingCompletion" });
          const params={ from, to, occasion, naive,reflections, instructions, inastyleof, language} ;
          const num=await recordSessionHistory({sessionid:sessionid as string,threadid,params:js(params),greeting:cachedResult,occasion:occasion as string});

          return res.status(200).json({ result: cachedResult,num });
        }
        if (isRecovery) {
          let count = 120;
          while (true) {
            const cachedResult = await redis?.get(k);
            if (cachedResult) {
              console.log("cachedResult:", cachedResult);
              const params={ from, to, occasion, naive,reflections, instructions, inastyleof, language} ;
              const num=await recordSessionHistory({sessionid:sessionid as string,threadid,params:js(params),greeting:cachedResult,occasion:occasion as string});
  
              return res.status(200).json({ result: cachedResult,num });
            }
            if (count-- < 0) {
              return res.status(501).json({ success: false });
            }
            await sleep(1000);
          }
        }
      } else {
       // const cachedResults = await redis?.lrange(k, 0, 4) || []; // Get the last 5 results from Redis as a list
        assistantMessages = history.map((row: any) => ({
          role: "assistant",
          content: row["greeting"],
        }));
        console.log(chalk.yellow("assistantMessages:"), js(assistantMessages));

        // Add instruction to make the new message dissimilar from the cached results
        additionalInstructions = `Make the new message as dissimilar as possible from the previous messages. Avoid using same words and ideas, if possible. Be imaginative.`;
      }
      const userMessage: ChatCompletionRequestMessage = {
        role: "user",
        content: `${text}`,
      };
      const messages: ChatCompletionRequestMessage[] = assistantMessages.length > 0 ? [...assistantMessages, userMessage] : [userMessage];
      if (assistantMessages.length > 0)
        messages[messages.length - 1].content += `\n${additionalInstructions}`;

      console.log("req.body", configuration.apiKey, messages);
      let completion;
      for (let i = 0; i < 4; i++) {
        try {
          completion = await openai.createChatCompletion({
            model: "gpt-4o-mini-2024-07-18",
            messages: messages,
          });
          if (completion) break;

          l("no completion loop", i);
        } catch (x) {
          l("SLEEP", x);
          await sleep(2000);
        }
      }
      if (!completion) {
        await recordEvent({ threadid, sessionid:"API=>"+ process.env.event_env+":"+(sessionid as string || ""), sid:sessionid as string||'',params: ""+messages.map(m=>m.content).join('***') + '===!@!!No Completion Possible', name: "createChatCompletion" });

        return res.status(200).json({ result: "no completion possible" });
      }   
      let content = `${completion.data.choices[0]?.message?.content}`;
      content=content.replace('```json\n','').replace('```','');
      content=content.replaceAll('\n','');
      console.log("result:", js(content));
     // const json=JSON.parse(content);
     // console.log("json:", js(json));
      await recordEvent({ threadid, sessionid: "API=>"+process.env.event_env+":"+(sessionid as string || ""),sid:sessionid as string||'', params:""+ messages.map(m=>m.content).join('***') + '===>Completion:' + content, name: "createChatCompletion" });
      const params={ from, to, occasion, naive,reflections, instructions, inastyleof, language} ;
      const num=await recordSessionHistory({sessionid:sessionid as string,threadid,params:js(params),greeting:content,occasion:occasion as string});
  
      // Store the latest result in Redis for one hour as part of the list
      await redis?.lpush(k, content);
      await redis?.ltrim(k, 0, 4);
      await redis?.expire(k, 600);
      await redis?.setex(`${text}`, 3600 * 24 * 7, content);
      l(chalk.redBright("RETURN WISH-TEXT",num));
      res.status(200).json({ result: content, num });

    } catch (e) {
      console.log("error:", e);
      res.status(500).json({ error: e });
    }
  }
  finally {
    redis?.quit();
    dbEnd(threadid)
  }
};
export default handleRequest;

