import type { NextApiRequest, NextApiResponse } from "next"
import { Configuration, OpenAIApi, ChatCompletionRequestMessage } from "openai"
import NextCors from 'nextjs-cors';
import { getRedisClient } from "../../../../lib/redis";
import { l, chalk, js, sleep } from "../../../../lib/common";
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
  const redis = await getRedisClient({});
  try {
    let text = req.body.text.replace(/\s/g, " ")
    text = text.replace(/<\/?[^>]+(>|$)/g, "");
    const k = text;
    try {
      const cachedResult = await redis?.get(k);
      if (cachedResult) {
        console.log("cachedResult:", cachedResult);
        return res.status(200).json({ result: cachedResult })
      }

      //count number of tokens 
      let tokens = text.split(" ").length;
      if (tokens > 3000)
        text = text.substring(0, 22000);
      tokens = text.split(" ").length;
      if (tokens > 3000)
        text = text.substring(0, 16000);
      tokens = text.split(" ").length;
      if (tokens > 3000)
        text = text.substring(0, 14000);
      console.log(chalk.yellow("tokens=", tokens))
      console.log("KEY=", configuration.apiKey)
      const messages: ChatCompletionRequestMessage[] = [{ "role": "user", "content": `In style of Raymond Chandler, please summarize in two very short paragraphs or less, keeping only the bare gist, only minimal and essential. Make it brief. Keep it under 520 characters. Split into two paragraphs if needed. Categorize using  one appropriate hash tag from this list (#illegals,#politics, #society, #warinukraine,#economy, #foreignaffairs,#military,#culture,#history,#health,#education,#crime,#sports,#science,#outdoors,#religion,#technology,#other). Attach the selected hashtag to the end of the summary. Do not show any other tags. Do not show "other" tag either.:${text}` },];
      console.log("req.body", configuration.apiKey, messages)
      //await sleep(10000);
      let completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: messages,
      })
      const content = `<p>${completion.data.choices[0]?.message?.content.replace('\n\n', '</p><p>')}</p>`;
      console.log("result:", js(content))
      await redis?.setex(`${k}`, 3600 * 24 * 7, content);
      res.status(200).json({ result: content })
    }
    catch (e) {
      console.log("error:", e)
      res.status(500).json({ error: e })
    }
  }
  finally {
    redis?.quit();
  }
}     