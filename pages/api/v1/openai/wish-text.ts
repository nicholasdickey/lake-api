import type { NextApiRequest, NextApiResponse } from "next";
import { Configuration, OpenAIApi, ChatCompletionRequestMessage } from "openai";
import NextCors from "nextjs-cors";
import { getRedisClient } from "../../../../lib/redis";
import { l, chalk, js, sleep } from "../../../../lib/common";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await NextCors(req, res, {
    // Options
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    origin: "*",
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  });

  const redis = await getRedisClient({});

  let { from, to, occasion, reflections,age, interests, style,fresh,recovery } = req.query;
  const text = `Generate ${
    style ? `in a style of ${style}` : ""
  } a wish message on occasion of ${
    occasion
  } ${
    occasion == "Birthday" ? `aged ${age}` : ""
  } from ${from?from:'[Your Name]'} ${
    to ? "to " + to : ""
  } ${
    reflections ? "also conside the following thoughts '" + reflections+"'" : ""
  }. Do not refer to yourself as "AI Language Model". Below that, separately, after the signature line, list 10 gift ideas for this person(s) ${interests?`also consider for the gift recommendation the following: ${interests};`:''}, putting amazon product search string in double quotes and a brief explanation. Title the gift section "Gift Suggestions". The interests should be considered but not exclusively - consider other approriate ideas.` ;   

  const k = text;
  const isFresh = fresh == '1';
  const isRecovery = recovery == '1';
  try {
    if(!isFresh){
    const cachedResult = await redis?.get(k);
    if (cachedResult) {
      console.log("cachedResult:", cachedResult);
      return res.status(200).json({ result: cachedResult });
    }
    if(isRecovery){
      let count=120
      while(true){
        const cachedResult = await redis?.get(k);
        if (cachedResult) {
          console.log("cachedResult:", cachedResult);
          return res.status(200).json({ result: cachedResult });
        }
        if(count--<0) {
          return res.status(501).json({ success:false });
        };
        await sleep(1000);
      }
    }

    }
    console.log("KEY=", configuration.apiKey);
    const messages: ChatCompletionRequestMessage[] = [
      { role: "user", content: `${text}` },
    ];
    console.log("req.body", configuration.apiKey, messages);

    let completion = null;
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
      return res.status(200).json({ result: "no completion possible" });
    }

    const content = `${completion.data.choices[0]?.message?.content}`;
    console.log("result:", js(content));
    await redis?.setex(`${k}`, 3600 * 24 * 7, content);
    res.status(200).json({ result: content });
  } catch (e) {
    console.log("error:", e);
    res.status(500).json({ error: e });
  }
}
