//./lib/layout.ts
import { l,chalk,js } from "./common";

    //density:'normal','thick','dense'
    export function processLayout({ channelLayout, userLayout, pageType, density, layoutNumber,leftOverride }:{channelLayout:any,userLayout:any,pageType:string,density:string,layoutNumber:string,leftOverride:string}) {
        let layoutView = {};

        //colW[x,y]  x: how many columns you need widh for. y: how many columns in the grid. For example, to find out the width of three column block in a 5 column layout colW[3,5]
        const colW = [null,
            [null, "100%", "50%", "33.3333%", "25%", "20%", "16.6666%", "14.2857%", "12.5%"],
            [null, "100%", "100%", "66.6666%", "50%", "40%", "33.3333%", "28.5714%", "25%"],
            [null, "100%", "100%", "100%", "75%", "60%", "50%", "42.8571%", "37.5%"],
            [null, "100%", "100%", "100%", "100%", "80%", "66.6666%", "57.1429%", "50%"],
            [null, "100%", "100%", "100%", "100%", "100%", "83.3333%", "71.4286%", "62.5%"],
            [null, "100%", "100%", "100%", "100%", "100%", "100%", "85.7142%", "75%"]]
        if (userLayout && userLayout[pageType] && userLayout[pageType][layoutNumber]) {
            let userTypeKeys = Object.keys(userLayout);
            userTypeKeys.forEach(key => {
                if (key == pageType) {
                    let chanTypeObject = channelLayout[key];
                    let userTypeObject = userLayout[key];
                    let userNumKeys = Object.keys(userTypeObject);
                    userNumKeys.forEach(numKey => {
                        if (numKey == layoutNumber) {
                            let userNumObject = userTypeObject[numKey];
                            let chanNumObject = chanTypeObject[numKey];
                            let chanResKeys = Object.keys(chanNumObject);
                            chanResKeys.forEach(resKey => {
                                let densityChanObject = chanNumObject[resKey];
                                let densityUserObject = userNumObject ? userNumObject[resKey] : null;
                                let columns = densityChanObject[density];
                                let spaces = 0;
                                if (columns) {
                                    columns.forEach((col:any) => {
                                        spaces += col.width;
                                    })
                                }
                                // @ts-ignore
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

            chanTypeKeys.forEach(key => {
                if(key=='user'||key=='userHome')
                return;
                if (key == pageType) {
                    //@ts-ignore
                    userLayout[pageType] = {}
                    let chanTypeObject = channelLayout[key];
                    let chanNumKeys = Object.keys(chanTypeObject);
                    chanNumKeys.forEach(numKey => {
                        if (numKey == layoutNumber) {
                            //@ts-ignore
                            userLayout[pageType][layoutNumber] = {};
                            let chanNumObject = chanTypeObject[numKey];
                            let chanResKeys = Object.keys(chanNumObject);
                            chanResKeys.forEach(resKey => {

                                let densityChanObject = chanNumObject[resKey];
                                let columns = densityChanObject[resKey=="w000"||resKey=="w600"||resKey=="w900"?'normal':density];

                                let spaces = 0;
                                if(leftOverride){
                                    const sel=leftOverride=='mix'?'newsviews':leftOverride=='comments'?'reacts':leftOverride;
                                    let col=columns[0];
                                    col.selector=sel||col.selector;
                                    columns[0]=col;
                                }
                                if (columns)
                                    columns.forEach((col:any) => {
                                        spaces += col.width;
                                    })
                                //@ts-ignore
                                layoutView[resKey] = { columns, spaces };
                                //@ts-ignore
                                userLayout[pageType][layoutNumber][resKey] = { density: densityChanObject }; // userLayout object in case user wants to change it
                            })
                        }
                    })
                }
            })
        }
        //now that we have the total number of spaces, we can calculate the percentWidth of each column
        let resKeys = Object.keys(layoutView);
        resKeys.forEach(key => {
            //@ts-ignore
            let resObject = layoutView[key];

            let spaces = resObject.spaces;
            let columns = resObject.columns;
            if(columns)
            columns.map((c:any) => {
                //@ts-ignore
                c.percentWidth = colW[c.width][spaces];
            })
            //@ts-ignore
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
        return { layoutView, userLayout, density, pageType, layoutNumber, hpads };
    }
    function changeUserSelector({ layout, spaceType, spaceIndex, selector }:{layout:any,spaceType:string,spaceIndex:number,selector:string}) {
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
            userColumns = userColumns.map((col:any) => {
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
