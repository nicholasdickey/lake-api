import type { NextApiRequest, NextApiResponse } from "next";
import { Configuration, OpenAIApi, ChatCompletionRequestMessage } from "openai";
import NextCors from "nextjs-cors";
import { getRedisClient } from "../../../../lib/redis";
import { l, chalk, js, sleep } from "../../../../lib/common";
import { recordEvent } from "../../../../lib/db/wishtext";
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
      } ${occasion == "Birthday" ? `` : ""
      } from ${from ? from : ""} ${to ? "to " + to : ""
      } ${reflections ? "also consider the following thoughts '" + reflections + "'" : ""
      }."Keep it around 400 characters unless instructed otherwise.Try to put a headline on a separate line.Like  Output github markdown. Use I or We , not third person.${lighthearted?"Make it hallmark humorous, if possible.":""} Do not add any meta information, like character count. No hashtags.${instructions ? "Additional instructions:'" + instructions + "'." : ""}${language ? "Use language:" + language : ""}`;
    
    console.log("Full text:", text);
    const k = sessionid + text;
    const isFresh = fresh == "1";
    const isRecovery = recovery == "1";
    let assistantMessages: ChatCompletionRequestMessage[] = [];
    let additionalInstructions: string = '';
    try {
      if (!isFresh) {
        console.log("fetching from redis isFresh:", isFresh);
        const cachedResult = await redis?.get(text);
        console.log("cachedResult:", cachedResult);

        if (cachedResult) {
          console.log("cachedResult:", cachedResult);
          await recordEvent({ threadid, sessionid: process.env.event_env + ":" + (sessionid as string || ""), params: ""+k+";conent:"+cachedResult, name: "cachedGreetingCompletion" });

          return res.status(200).json({ result: cachedResult });
        }
        if (isRecovery) {
          let count = 120;
          while (true) {
            const cachedResult = await redis?.get(k);
            if (cachedResult) {
              console.log("cachedResult:", cachedResult);
              return res.status(200).json({ result: cachedResult });
            }
            if (count-- < 0) {
              return res.status(501).json({ success: false });
            }
            await sleep(1000);
          }
        }
      } else {
        const cachedResults = await redis?.lrange(k, 0, 4) || []; // Get the last 5 results from Redis as a list
        assistantMessages = cachedResults.map((result: any) => ({
          role: "assistant",
          content: result,
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
            model: "gpt-3.5-turbo",
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
        await recordEvent({ threadid, sessionid: process.env.event_env+":"+(sessionid as string || ""), params: ""+messages.map(m=>m.content).join('***') + '===!@!!No Completion Possible', name: "createChatCompletion" });

        return res.status(200).json({ result: "no completion possible" });
      }   
      const content = `${completion.data.choices[0]?.message?.content}`;
      console.log("result:", js(content));
      await recordEvent({ threadid, sessionid: process.env.event_env+":"+(sessionid as string || ""), params:""+ messages.map(m=>m.content).join('***') + '===>Completion:' + content, name: "createChatCompletion" });

      // Store the latest result in Redis for one hour as part of the list
      await redis?.lpush(k, content);
      await redis?.ltrim(k, 0, 4);
      await redis?.expire(k, 600);
      await redis?.setex(`${text}`, 3600 * 24 * 7, content);
      res.status(200).json({ result: content });

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

