//./lib/process-post-body.ts
 //@ts-ignore
import cheerio from "whacko"
import { l, chalk, js } from "./common";


export  function processPostBody(body:string) {
   if(!body)
   return;
   const md=body; 
   let changed=false;
   let $ = cheerio.load(md, {
    decodeEntities: true,
})

    //has to use jquery as the link is scrambled and markdown uses the b
    const tokens= ["uploads.disquscdn", "jpg", "png", "gif", "giphy"];
    tokens.forEach(function (
        token
    ) {
        let disqusImages = $(`a[href *= "${token}"]`);
        disqusImages.each(function () {
             //@ts-ignore
            let el = $(this);
            const href = el.attr("href");
            if (
                (href.indexOf("disqus") >= 0 ||
                    href.indexOf("disq.us") >= 0) &&
                href.indexOf("imgurl") < 0
            ) {
                let src = href.split("url=");
                if (src[1]) src = decodeURIComponent(src[1]);
                else src = href;
                const w = src ? src.split(token) : [];
                if (w[1]) {
                    const w1 = w[1];
                    const s = w1.split(":")[0];
                    src = w[0] + token + s;
                }
                const htm = `<img style="height: 100%; width: 100%;" src="${src}"  /> `;
                el.replaceWith(htm);
                changed = true;
            }
        });
    });
    if(changed)
        return $('body').html();
    return body;
}