import { l, chalk, js, sleep } from "../lib/common";
import digest from '../lib/openai/digest';

await digest(
    'rss-qwiket',
    5
);
await sleep(5000)
process.exit();
