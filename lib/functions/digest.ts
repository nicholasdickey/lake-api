
import { Configuration, OpenAIApi, ChatCompletionRequestMessage } from "openai"
import { l, chalk, js, sleep } from "../common";
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration);

export default async function digest(
  body: string
) {
  try {
    let text = body.replace(/\s/g, " ")
    text = text.replace(/<\/?[^>]+(>|$)/g, "");
    const k = text;
    try {
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
      const messages: ChatCompletionRequestMessage[] = [{ "role": "user", "content": `Please summarize in two very short paragraphs or less, keeping only the bare gist, only minimal and essential. Make it brief. Keep it under 240 characters.  Use "Putin's regime" instead of Russia. Use "Illegal Aliens" instead of migrants where the context is in US. Use "Palestinian Arabs" instead of "Palestinians". Use "Judea and Samaria" instead of "West Bank". Do not use and hashtags.:${text}` },];
      let completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: messages,
      })
      const content = `<p>${completion.data.choices[0]?.message?.content.replace('\n\n', '</p><p>')}</p>`;
      console.log("result:", js(content))
      return content;
    }
    catch (e) {
      console.log("error:", e)
    }
  }
  finally {

  }
}     