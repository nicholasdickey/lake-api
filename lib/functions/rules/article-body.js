import { l, chalk, microtime, js, ds,uxToMySql } from "../../common.js";


const rule=(b)=>{
    b.find(`a`).remove();

    l("article-body",b.html());
    return b.text();
}
export default rule;