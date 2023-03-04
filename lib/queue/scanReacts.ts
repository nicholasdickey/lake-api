import { isReturnStatement } from "typescript";
import { l, chalk, js } from "../common";
import { Qwiket } from "../types/qwiket";
import {fetchPosts,getPost} from "../db/qwiket";
const scanReacts = async ({ reactsKey, lastid, forum, redis, threadid,page, size, countonly }: { reactsKey: string, lastid: string, forum: string, redis: any, threadid:number, page: number, size: number, countonly: number }) => {
    page=+page;
    size=+size;
    if(page&&!lastid){
        return {
            success:false,
            msg:'no lastid',
            items:[]
        }
    }
   // l(chalk.green.bold("scanReacts",js({reactsKey, lastid, forum,page, size, countonly})))
    /**
     * Check if reacts queue exists in redis, rebuild if missing
     */
    
    const card=await redis.zcard(reactsKey);
    if(card==0){
        const posts=await fetchPosts({threadid,forum,size:1000});
        posts.forEach(post=>{
            const {qpostid,createdat}=post;
            //TODO 
        })

    }
    let count = 0;
    if (lastid) {
        while (true) {
            const test=await redis.zrevrange(reactsKey, count, count);
            //l(test)
            const qpostid = (await redis.zrevrange(reactsKey, count, count))[0];
           // l('scan for lastid',js({lastid,qpostid}))
            if (qpostid == lastid){
                l("match")
                break;
            }
            if(count++>1000)
            break;

        }
    }
  //  l(chalk.cyan.bold("MATCHED LASTID",count))
    if(countonly)
        return {
            success:true,
            newItems:count,
            items:[]
        }
    const qpostidItems=await redis.zrevrange(reactsKey,count+page*size,(count+page*size)+size-1);
    l(chalk.green.bold("Got Items:",count,page,size,count+page*size,(count+(page*size))+size-1,js({qpostidItems,start:count+page*size,end:count+(page*size)+size-1})))

    const pjsonKeys=qpostidItems.map((k:string)=>`pjson-${forum}-${k}`);
    l(js({pjsonKeys}))
    const itemsRaw=await redis.mget(pjsonKeys);
    l(js({itemsRaw}))
    for (let i=0;i<itemsRaw.length;i++){
        const item=itemsRaw[i];
        if(!item){
          
            const key=pjsonKeys[i];
            const partsKey=key.split('-');
            const qpostid=partsKey[partsKey.length-1];
            l(chalk.yellow("no item",key,qpostid))
            const result=await getPost({threadid,qpostid});
            if(result.success){
                itemsRaw[i]=JSON.stringify(result.react);
                l(chalk.green.bold("itemsRaw:", itemsRaw[i]))
                //  await redis.setex(key,7*24*3600,itemsRaw[i])
            }
        }
    }
    const items=itemsRaw.map((i:string)=>{
        
      // l("iterating",i)
        return {item:JSON.parse(i)}
        
    });
    l(js({items}))
  
    return {
        success:true,
        type:'reacts',
        items,
        lastid:lastid||items[0].item.qpostid
    }
}
export default scanReacts;