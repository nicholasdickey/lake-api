//Layout Interpreter
/*
"layout": {
        "newsline": {
            "1": {
                "900+": {
                    "normal": [
                        {
                            "type": "Column",
                            "width": 1
                        },
                        {
                            "type": "MP",
                            "width": 2
                        },
                        {
                            "type": "Column",
                            "width": 1
                        }
                    ],
                    "thick": [],
                    "dense": []
                }
            },
            "1200+": {
                "normal": [],
                "thick": [],
                "dense": []
            },
            "1800+": {
                "normal": [],
                "thick": [],
                "dense": []
            },
            "2100+": {
                "normal": [],
                "thick": [],
                "dense": []
            }
        }
    }
    */
   // import Immutable from 'immutable'

import { l,chalk,js } from "./common";

    //density:'normal','thick','dense'
    export function processLayout({ channelLayout, userLayout, pageType, density, layoutNumber,leftOverride }) {
        let layoutView = {};
        console.log({ pageType, density, channelLayout, userLayout })
        //colW[x,y]  x: how many columns you need widh for. y: how many columns in the grid. For example, to find out the width of three column block in a 5 column layout colW[3,5]
        const colW = [null,
            [null, "100%", "50%", "33.3333%", "25%", "20%", "16.6666%", "14.2857%", "12.5%"],
            [null, "100%", "100%", "66.6666%", "50%", "40%", "33.3333%", "28.5714%", "25%"],
            [null, "100%", "100%", "100%", "75%", "60%", "50%", "42.8571%", "37.5%"],
            [null, "100%", "100%", "100%", "100%", "80%", "66.6666%", "57.1429%", "50%"],
            [null, "100%", "100%", "100%", "100%", "100%", "83.3333%", "71.4286%", "62.5%"],
            [null, "100%", "100%", "100%", "100%", "100%", "100%", "85.7142%", "75%"]]
        if (userLayout && userLayout[pageType] && userLayout[pageType][layoutNumber]) {
            console.log(222)
            let userTypeKeys = Object.keys(userLayout);
            userTypeKeys.forEach(key => {
                console.log('000',key)
                if (key == pageType) {
                    let chanTypeObject = channelLayout[key];
                    let userTypeObject = userLayout[key];
                    let userNumKeys = Object.keys(userTypeObject);
                    userNumKeys.forEach(numKey => {
                        console.log(111,numKey)
                        if (numKey == layoutNumber) {
                            let userNumObject = userTypeObject[numKey];
                            let chanNumObject = chanTypeObject[numKey];
                            let chanResKeys = Object.keys(chanNumObject);
                            chanResKeys.forEach(resKey => {
                                let densityChanObject = chanNumObject[resKey];
                                console.log({ densityChanObject })
                                let densityUserObject = userNumObject ? userNumObject[resKey] : null;
                                let columns = densityChanObject[density];
                                let spaces = 0;
                                if (columns) {
                                    columns.forEach(col => {
                                        spaces += col.width;
                                    })
                                }
                                layoutView[resKey] = { columns: densityUserObject && densityUserObject[density] ? densityUserObject[density] : densityChanObject[density], spaces };
                            })
                        }
                    })
                }
            })
        }
        else {
            let chanTypeKeys = Object.keys(channelLayout);
            let userLayout = {};
            console.log("NO USER LAYOUT", { chanTypeKeys })
            chanTypeKeys.forEach(key => {
                if(key=='user'||key=='userHome')
                return;
                console.log("iterating types", { key, pageType,match:key.localeCompare(pageType) })
                console.log("comparing",key,pageType)
                if (key == pageType) {
                    console.log("match",key)
                    userLayout[pageType] = {}
                    let chanTypeObject = channelLayout[key];
                    let chanNumKeys = Object.keys(chanTypeObject);
                    chanNumKeys.forEach(numKey => {
                        console.log("iterating layout numbers", { numKey, layoutNumber })
                        if (numKey == layoutNumber) {
                            userLayout[pageType][layoutNumber] = {};
                            let chanNumObject = chanTypeObject[numKey];
                            let chanResKeys = Object.keys(chanNumObject);
                            chanResKeys.forEach(resKey => {
                                console.log("iterating resolutions", resKey)
                                let densityChanObject = chanNumObject[resKey];
                                console.log(JSON.stringify({ densityChanObject }))
                                let columns = densityChanObject[resKey=="w000"||resKey=="w600"||resKey=="w900"?'normal':density];
                                console.log({ columns })
                                let spaces = 0;
                                if(leftOverride){
                                    const sel=leftOverride=='mix'?'newsviews':leftOverride=='comments'?'reacts':leftOverride;
                                    let col=columns[0];
                                  //  l(chalk.blue.bold("col override:",js({sel,col,leftOverride})))
                                    col.selector=sel||col.selector;
                                 //   l(chalk.blue.bold("col override2:",js({col})))
                                    columns[0]=col;
                                }
                                if (columns)
                                    columns.forEach(col => {
                                        spaces += col.width;
                                    })
                                layoutView[resKey] = { columns, spaces };
    
                                userLayout[pageType][layoutNumber][resKey] = { density: densityChanObject }; // userLayout object in case user wants to change it
                            })
                        }
                    })
                }
            })
            console.log(111)
        }
        //now that we have the total number of spaces, we can calculate the percentWidth of each column
        console.log(js({layoutView}))
        let resKeys = Object.keys(layoutView);
         console.log(">>>>>>>>>>>>>", { resKeys })
        resKeys.forEach(key => {
            let resObject = layoutView[key];
            console.log({ key, resObject })
            let spaces = resObject.spaces;
            let columns = resObject.columns;
            if(columns)
            columns.map(c => {
                console.log("PROCESS LAYOUT", c.width, spaces, colW[c.width][spaces])
                c.percentWidth = colW[c.width][spaces];
            })
            layoutView[key] = { spaces, columns };
        })
        //last, we will add for reference the margin percentages (hpad) for the grid at each resolution (note,there are more hpad resolutions than layout versiona):
        let hpads = {
            "w0": "5px",
            "w750": "2.5%",
            "w900": "1%",
            "w1200": "1%",
            "w1600": "6%",
            "w1800": "6%",
            "w1950": "8%",
            "w2100": "9%",
            "w2400": "10%"
        }
      //  l(chalk.green(js( { layoutView, userLayout, density, pageType, layoutNumber, hpads })))
        return { layoutView, userLayout, density, pageType, layoutNumber, hpads };
    }
    function changeUserSelector({ layout, spaceType, spaceIndex, selector }) {
        let { userLayout, density, pageType, layoutNumber } = layout;
        let width = window.innerWidth;
        let resKey = 'w2100';
        if (width < 2100)
            if (width < 1800)
                if (width < 1200)
                    resKey = 'w900';
                else
                    resKey = 'w1200';
            else
                resKey = 'w1800';
    
        let userColumns = userLayout[pageType][layoutNumber][resKey][density];
        let columnIndex = 0;
        let st = spaceType == 'msc' ? 'mp' : spaceType;
        if (userColumns) {
            userColumns = userColumns.map(col => {
                if (col.type == st) {
                    if (spaceType == 'msc') {
                        col.msc = selector
                    }
                    if (spaceIndex == columnIndex)
                        col.selector = selector;
                }
                return col;
            })
            userLayout[pageType][layoutNumber][resKey][density] = userColumns;
    
        }
    
        return userLayout;
    
    
    }
    /*export function parseLayout({ app, session, pageType }) {
        // console.log({ pageType, session: session ? session : {} })
        if (!session.get) {
            console.log("SESSION FIX", session)
            session = Immutable.fromJS(session);
        }
        let userLayout = session.get("userLayout") ? session.get("userLayout").toJS() : {};
        let channel = app.get("channel");
        //console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!", { app: app.toJS() })
        // console.log({ channel: app ? app.get("channel").toJS() : {} })
        let channelDetails = channel ? channel.get("channelDetails") : null;
        if (!channelDetails)
            return <div />
        // console.log({ channelDetails: channelDetails ? channelDetails.toJS() : {} })
        let channelConfig = channelDetails && channelDetails.get('config') ? channelDetails.get('config').toJS() : {};
        let channelLayout = channelConfig.layout;
    
        let density = +session.get("thick") ? +session.get("dense") ? "dense" : "thick" : "normal";
        let layoutNumber = session.get("layoutNumber") ? session.get("layoutNumber") : "l1";
        // console.log({ channelConfig, channelLayout, userLayout, pageType, density, layoutNumber })
        let layout = processLayout({ channelLayout, userLayout, pageType, density, layoutNumber });
        //console.log({ layout })
        return layout;
    }
    */
    //module.exports = { parseLayout, processLayout, changeUserSelector };