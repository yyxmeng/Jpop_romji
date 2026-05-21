function extractLyrics(code){

    const regex =
/L\s*\(\s*\[(.*?)\]\s*\)/gs;

    let lines=[];

    let m;

    while(
        (m=regex.exec(code)
    ){

        let chunk =
            m[1];

        let txt='';

        /*
        處理 ruby:
        [`漢字`,`讀音`]
        → 漢字
        */

        chunk =
            chunk.replace(

/\[\s*`([^`]+)`\s*,\s*`([^`]+)`\s*\]/g,

                '$1'
            );

        /*
        抓普通字串
        */

        const plainRegex =
/`([^`]+)`/g;

        let p;

        while(
            (p=plainRegex.exec(chunk))
        ){

            txt += p[1];
        }

        txt =
            txt
            .replace(/\s+/g,' ')
            .trim();

        if(txt){

            lines.push(txt);
        }
    }

    return lines;
}
