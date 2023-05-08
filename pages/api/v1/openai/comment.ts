import type { NextApiRequest, NextApiResponse } from "next"
import { Configuration, OpenAIApi, ChatCompletionRequestMessage } from "openai"
import NextCors from 'nextjs-cors';
//@ts-ignore
import cheerio from "whacko"
import { l, chalk, js, sleep } from "../../../../lib/common";
import { getQwiket } from "../../../../lib/db/qwiket";
import { getPost } from "../../../../lib/db/post";

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
  let { postid: rawPostid = -1, slug: rawSlug = '' } = req.query;
  //count number of tokens 
  //get qwiket from q table
  //get all parent posts from a recursive function
  const postid = rawPostid as number;
  const slug = rawSlug as string;
 // l(chalk.green('comment.ts: slug:', slug, 'postid:', postid))
  if (!postid || !slug)
    return res.status(403).json({ error: 'missing postid or slug' });
  const withBody: [0, 1] = 1 as any;
  const qwiket = await getQwiket({ threadid, slug, withBody });
  let description = qwiket?.description;
  const descrParts: string[] | undefined = description?.split("{ai:summary}");
  let summary = '';
  if (descrParts?.length) {
    description = descrParts[0];
    summary = descrParts.length > 1 ? descrParts[1] : '';
    if (summary.trim() == '[object Object]')
      summary = '';
  }
  //summary = encodeEntities(summary);

  let rawBody: any = qwiket?.body;
  let text = ''

  if (rawBody) {
    l(chalk.red('rawBody:', js(rawBody), typeof (rawBody)))
    // const body=JSON.parse(rawBody);
    const blocks = rawBody['blocks'];
    //l(chalk.cyan('blocks:', js(blocks)))
    for (let i = 0; i < blocks.length; i++) {
      const block: { blockType: string, html: string | null } = blocks[i];
      //l("blockType", block.blockType)
      if (block.blockType == 'html') {
        const body = block.html || '';
        const $ = cheerio.load(`<html>${body}</html`);
        text = $(`html`).text();
        break;;
      }

    }
  }
 // l("TEXT:", text)
  let tokens = text.split(" ").length;
  if (tokens > 3000)
    text = text.substring(0, 22000);
  tokens = text.split(" ").length;
  if (tokens > 3000)
    text = text.substring(0, 16000);
  tokens = text.split(" ").length;
  if (tokens > 3000)
    text = text.substring(0, 14000);
// console.log(chalk.yellow("tokens=", tokens))
 // console.log("KEY=", configuration.apiKey)
  let messages: ChatCompletionRequestMessage[] = [{ "role": "user", "content": `Please summarize in two short paragraphs or less in the style of Ernst Hemingway:${text}` }, { "role": "assistant", "content": summary }];
  //implement stack for posts 
  interface Post {
    postid: number;
    parentid: number;
    body: string;
    author_avatar: string;
    author_username: string;
    author_name: string;
  }
  interface IStack<T> {
    push(item: T): void;
    pop(): T | undefined;
    peek(): T | undefined;
    size(): number;
  }
  class Stack<T> implements IStack<T> {
    private storage: T[] = [];

    constructor(private capacity: number = Infinity) { }

    push(item: T): void {
      if (this.size() === this.capacity) {
        throw Error("Stack has reached max capacity, you cannot add more items");
      }
      this.storage.push(item);
    }

    pop(): T | undefined {
      return this.storage.pop();
    }

    peek(): T | undefined {
      return this.storage[this.size() - 1];
    }

    size(): number {
      return this.storage.length;
    }
  }
  const stack = new Stack<Post>();
  //now recursively get all parent posts
  let pid: number = postid;
  while (true) {
    const post: Post = await getPost({ threadid, postid: pid });
    if (!post)
      break;
    stack.push(post);
    const { parentid } = post;
    if (parentid == -1)
      break;
    pid = parentid;
  }
  while (stack.size() > 0) {
    const post = stack.pop();
    if (post) {
      messages.push({ role: "user", content: `User '${post.author_name}' commented: ${post.body.replaceAll('<p>', '').replaceAll('</p>', '')}` });
    }

  }
  messages.push({ role: "user", content: `Please respond to the last comment in the context of the original article and the subsequent comments.` })
  console.log("messages:", configuration.apiKey, messages)
  
  let completion=null ;
  for (let i = 0; i < 4; i++) {
    l(chalk.cyan.bold("CALLING AI",i))
    try {
      completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: messages,
      })
      if (completion) {
        break;
      }
    }
    catch (x) {
      l('SLEEP', x);
      await sleep(10000);
    }
  }
  if (!completion) {
    return res.status(200).json({ result: 'no  completion possible' })
  }
  const content = `<p>${completion.data.choices[0]?.message?.content.replace('\n\n', '</p><p>')}</p>`;
  console.log("result:", js(content))

  res.status(200).json({ result: content })
  
}