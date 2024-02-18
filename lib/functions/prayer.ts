import { Configuration, OpenAIApi, ChatCompletionRequestMessage } from "openai"
import { l, chalk, js, sleep } from "../common";
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration);

export default async function prayer(
    req: string
) {
    try {
        let text = req.replace(/\s/g, " ")
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
            const messages: ChatCompletionRequestMessage[] = [{
                "role": "user", "content":
                    `Create Pentacostal prayer under 600 characters for this request: ${req}.
                    Attach an appropriate scripture to the prayer. Do not say "Scripture:" just attach it.`
            },];
            let completion = await openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: messages,
            })
            console.log("messages:", js(messages));
            const content = `<p>${completion.data.choices[0]?.message?.content.replaceAll('\n\n', '</p><p>')}</p>`;
            console.log("result:", js(content));
            return content;
        }
        catch (e) {
            console.log("error:", e)
        }
    }
    finally {

    }
}     