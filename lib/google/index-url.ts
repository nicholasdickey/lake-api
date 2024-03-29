import { google } from "googleapis"
import { l, chalk, js } from "../common"
import request from "request";
import clientSecrets from "./client_secrets.json" assert { type: 'json' };

export const indexUrl = async (url: string) => {

  let jwtClient = new google.auth.JWT(
    clientSecrets.client_email,
    undefined,
    clientSecrets.private_key,
    ['https://www.googleapis.com/auth/indexing']);

  const tokens = await jwtClient.authorize();

  let options = {
    url: "https://indexing.googleapis.com/v3/urlNotifications:publish",
    method: "POST",
    // Your options, which must include the Content-Type and auth headers
    headers: {
      "Content-Type": "application/json"
    },
    auth: {
      "bearer": tokens.access_token
    },
    // Define contents here. The structure of the content is described in the next step.
    json: {
      "url": url,
      "type": "URL_UPDATED"
    },

  }
  l(chalk.green("submitting the request to google", js(options)))

  // @ts-ignore
  await request(options);
  const bingUrl = `https://www.bing.com/indexnow?url=${encodeURIComponent(url)}&key=8d8708d26eaf43bab09eedbae2f3943a`;
  l(chalk.magenta.bold("=======> SUBMIT URL TO BING:", bingUrl))
  const { body } = await request(bingUrl)
  l("bingdresponse=", js(body))
}