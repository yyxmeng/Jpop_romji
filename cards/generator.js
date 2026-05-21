const logEl =
document.getElementById('log');

function log(msg){

    logEl.textContent +=
        msg + '\n';
}

async function loadJSON(path){

    const r =
        await fetch(path);

    return r.json();
}

function containsKanji(str){

    return /[\u4E00-\u9FFF]/.test(str);
}

function isKatakana(str){

    return /^[\u30A0-\u30FFー]+$/
        .test(str);
}

function extractWords(text){

    const result=[];

    const tokens =
        text.match(
/[\u4E00-\u9FFF々ヶ]+|[\u30A0-\u30FFー]+/g
        )||[];

    return [...new Set(tokens)];
}

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

async function generate(){

    logEl.textContent='';

    const songPath =
        document
        .getElementById(
            'songPath'
        )
        .value
        .trim();

    if(!songPath){

        log('請輸入歌曲路徑');

        return;
    }

    try{

        const stopwords =
            await loadJSON(
'data/stopwords.json'
            );

        const songRes =
            await fetch(
                '../'+songPath
            );

        const songCode =
            await songRes.text();

        const lyrics =
            extractLyrics(
                songCode
            );

        log(
`歌詞行數:${lyrics.length}`
        );

        let cards=[];

        for(const line of lyrics){

            const words =
                extractWords(
                    line
                );

            for(const word of words){

                if(
                    stopwords
                    .includes(word)
                ){

                    continue;
                }

                const type =
                    containsKanji(word)
                    ?'kanji'
                    :'katakana';

                cards.push({

                    key:word,

                    word,

                    type,

                    source:line
                });
            }
        }

        cards=
            [...new Map(
                cards.map(
                    c=>[
                        c.key,
                        c
                    ]
                )
            ).values()];

        log(
`生成字卡:${cards.length}`
        );

        log(
JSON.stringify(
cards,
null,
2
        ));

    }

    catch(e){

        console.error(e);

        log(
'失敗:'+e.message
        );
    }
}
