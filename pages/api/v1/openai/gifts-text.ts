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
    let { sessionid, from, to, occasion, reflections, age, interests, style, fresh, recovery } = req.query;
    const text = `Generate gifts suggestions on occasion of ${occasion
      } from ${from ? from : ''} ${to ? "to " + to : ""
      } ${reflections ? "also consider the following thoughts '" + reflections + "'" : ""
      }.  list 10 gift ideas for this person(s) ${interests ?
        `,also consider for the gift recommendation, not exclusively, the following interests: ${interests}` : ''}, putting the appropriate product search strings in double quotes. The interests should be considered but not exclusively - consider other approriate ideas.`;

    const k = text;
    const isFresh = fresh == '1';
    const isRecovery = recovery == '1';
    try {
      if (!isFresh) {
        const cachedResult = await redis?.get(k);
        if (cachedResult) {
          //console.log("cachedResult:", cachedResult);
          await recordEvent({ threadid, sessionid: "API=>"+process.env.event_env + ":" + (sessionid as string || ""), params: ""+k+";conent:"+cachedResult, name: "cachedGiftsCompletion" });

          return res.status(200).json({ result: cachedResult });
        }
        if (isRecovery) {
          let count = 120
          while (true) {
            const cachedResult = await redis?.get(k);
            if (cachedResult) {
              //console.log("cachedResult:", cachedResult);
              return res.status(200).json({ result: cachedResult });
            }
            if (count-- < 0) {
              return res.status(501).json({ success: false });
            };
            await sleep(1000);
          }
        }

      }
     // console.log("KEY=", configuration.apiKey);
      const messages: ChatCompletionRequestMessage[] = [
        { role: "user", content: `${text}` },
      ];
    //  console.log("req.body", configuration.apiKey, messages);

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
        await recordEvent({ threadid, sessionid: "API=>"+process.env.event_env + ":" + (sessionid as string || ""), params: messages.map(m => m.content).join('***') + '===!@!!No Completion Possible', name: "giftsCompletion" });

        return res.status(200).json({ result: "no completion possible" });
      }

      const content = `${completion.data.choices[0]?.message?.content}`;
    //  console.log("result:", js(content));
      await recordEvent({ threadid, sessionid: "API=>"+process.env.event_env + ":" + (sessionid as string || ""), params: messages.map(m => m.content).join('***') + '===>Completion:' + content, name: "giftsCompletion" });

      await redis?.setex(`${k}`, 3600 * 24 * 7, content);
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
