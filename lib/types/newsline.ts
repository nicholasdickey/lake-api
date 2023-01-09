/**
 * Keeps the state of an item in the newsline definition, both from Redis and db
 */
export interface NewslineDefinitionItem {
    tag:string;
    switch?:'off'|'on';
    description?:string;
};
export interface NewslineDefinition extends Array<NewslineDefinitionItem>{};
/**
 * Data needed for you UI to show in User Feeds Navigator
 */
export interface ExplorerPublication {
    tag:string;
    name?:string;
    icon?:string;
    description?:string;
    default?:boolean;
    switch?:'off'|'on';
};
export interface Publications extends Array<ExplorerPublication>{};

export type Tag=string;

export interface Newsline extends Array<Tag>{};

export interface TagDefinition {  // a.k.a category from V51 and defined_tags from V10
    tag:string; //a.k.a shortname
    name:string;
    description:string;
    icon:string;
}
