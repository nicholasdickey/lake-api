/*export interface Qwiket{
    description:string;
    image:string;
    site_name:string;
    tag:string;
    body?:string;
    author:string;
    slug:string;
    published_time:string;
    shared_time:string;
}*/

export interface Qwiket{
    catName?: string,
    catIcon?: string,
    postBody?:string,
    qpostid?:number,
    id?:number,
    published_time:number,
    shared_time: number,
    slug: string,
    title:string,
    site_name?: string,
    url?: string,
    description: string,
    author?:string,
    image: string,
    tag: string,
    body?:String,
    createdat?:number,
    author_username?:string,
    author_avatar?:string,
    author_name?:string,
    thread_title?:string,
    thread_url?:string,
    thread_image?:string,
    thread_author?:string,
    subscr_status?:number,
    hasBody?:boolean,
    ack?:boolean

}
