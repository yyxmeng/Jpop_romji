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

/*
解析歌曲JS → 抓L()
*/

function extractLyrics(code){

    const regex =
/L\s*\(\s*\[(.*?)\]\s*\)/gs;

    let lines=[];

    let m;

    while(
        (m=regex.exec(code)
    ){

        lines.push(
            m[1]
        );
    }

    return lines;
}

/*
真正單詞抽取
*/

function extractWords(line){

    const result=[];

    /*
    ruby詞彙
    */

    const rubyRegex=
/\[\s*`([^`]+)`\s*,\s*`([^`]+)`\s*\]/g;

    let m;

    while(
        (m=rubyRegex.exec(line))
    ){

        let word=
            m[1].trim();

        let reading=
            m[2].trim();

        if(
            !containsKanji(word)
            &&
            !isKatakana(word)
        ){
            continue;
        }

        result.push({

            word,
            reading,

            type:
                containsKanji(word)
                ?'kanji'
                :'katakana'
        });
    }

    /*
    純片假名補抓
    */

    const cleanLine =
        line.replace(
            rubyRegex,
            ''
        );

    const katakana=
        cleanLine.match(
/[\u30A0-\u30FFー]{2,}/g
        )||[];

    for(const k of katakana){

        result.push({

            word:k,

            reading:null,

            type:'katakana'
        });
    }

    return result;
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

        log(
'請輸入歌曲路徑'
        );

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

        for(
            const line
            of lyrics
        ){

            const words =
                extractWords(
                    line
                );

            for(
                const item
                of words
            ){

                const word=
                    item.word;

                if(
                    stopwords.includes(
                        word
                    )
                ){
                    continue;
                }

                cards.push({

                    key:
                        item.reading
                        ?`${word}|${item.reading}`
                        :word,

                    word,

                    reading:
                        item.reading,

                    type:
                        item.type
                });
            }
        }

        /*
        去重
        */

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
)
        );
    }

    catch(e){

        console.error(e);

        log(
'失敗:'+e.message
        );
    }
}

window.generate =
generate;
