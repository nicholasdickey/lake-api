import type { NextApiRequest, NextApiResponse } from "next"
import { Configuration, OpenAIApi,ChatCompletionRequestMessage } from "openai"
import NextCors from 'nextjs-cors';
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
    let text=req.body.text.replace(/\s/g, " ")
    //count number of tokens 
    let tokens=text.split(" ").length;
    if(tokens>3000)
    text=text.substring(0,22000);
    tokens=text.split(" ").length;
    if(tokens>3000)
    text=text.substring(0,16000);
    tokens=text.split(" ").length;
    if(tokens>3000)
    text=text.substring(0,14000);
    console.log(chalk.yellow("tokens=",tokens))
    console.log("KEY=",configuration.apiKey)
    const messages:ChatCompletionRequestMessage[]=[{ "role": "user", "content":`Please summarize in two paragraphs or less in the style of Dirty Harry - Clint Eastwood's character:${text}` },];
    console.log("req.body", configuration.apiKey,messages)
  await sleep(10000);
  let completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: messages,
  })
  const content=`<p>${completion.data.choices[0]?.message?.content.replace('\n\n','</p><p>')}</p>`;
  console.log("result:",js(content))

  res.status(200).json({ result: content })
}