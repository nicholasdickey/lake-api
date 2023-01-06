/**
 * Keeps the state of an item in the newsline definition, both from Redis and db
 */
export interface NewslineDefinitionItem {
    tag:string;
    default?:boolean;
    switch?:string;
};
export interface NewslineDefinition extends Array<NewslineDefinitionItem>{};
/**
 * Data needed for you UI to show in User Feeds Navigator
 */
export interface ExplorerPublication {
    tag:string;
    name:string;
    icon:string;
    description:string;
    default?:boolean;
    switch?:string;
};
export interface Publications extends Array<ExplorerPublication>{};

export type Tag=string;

export interface Newsline extends Array<Tag>{};