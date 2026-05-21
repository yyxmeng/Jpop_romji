const logEl =
document.getElementById('log');

function log(msg){
    logEl.textContent += msg + '\n';
}

async function loadJSON(path){
    const r = await fetch(path);
    return r.json();
}

function containsKanji(str){
    return /[\u4E00-\u9FFF]/.test(str);
}

function extractWords(songCode){

    const cards=[];

    const lineRegex =
/L\s*\(\s*\[(.*?)\]\s*\)/gs;

    let lm;

    while(
        (lm=lineRegex.exec(songCode))
    ){

        const chunk =
            lm[1];

        const tokenRegex =
/\[\s*`([^`]+)`\s*,\s*`([^`]+)`\s*\]|`([^`]+)`/g;

        let tm;

        let currentWord='';
        let currentReading='';

        function flush(){

            if(!currentWord)
                return;

            cards.push({

                key:
`${currentWord}|${currentReading}`,

                word:
                    currentWord,

                reading:
                    currentReading,

                type:'kanji'
            });

            currentWord='';
            currentReading='';
        }

        while(
            (tm=tokenRegex.exec(chunk))
        ){

            /*
            ruby
            */

            if(tm[1]){

                flush();

                currentWord =
                    tm[1];

                currentReading =
                    tm[2];
            }

            /*
            普通字串
            */

            else{

                const text =
                    tm[3];

                if(!text)
                    continue;

                /*
                純假名 → 接續
                */

                if(
/^[ぁ-んァ-ヶー\s]+$/
                    .test(text)
                ){

                    currentWord +=
                        text.trim();

                    currentReading +=
                        text.trim();
                }

                /*
                英文/空白
                */

                else{

                    flush();
                }
            }
        }

        flush();
    }

    /*
    ===== 片假名 =====
    */

    const kataRegex =
/[\u30A0-\u30FFー]{2,}/g;

    const katakana =
        songCode.match(
            kataRegex
        )||[];

    for(const k of katakana){

        cards.push({

            key:k,

            word:k,

            type:'katakana'
        });
    }

    return cards;
}

function extractLyrics(code){

    const regex =
/L\s*\(\s*\[(.*?)\]\s*\)/gs;

    let lines=[];

    let m;

    while(
        (m = regex.exec(code))
    ){

        let chunk = m[1];

        let txt='';

        /*
        先處理 ruby
        [`漢字`,`讀音`] → 漢字
        */

        chunk =
            chunk.replace(
/\[\s*`([^`]+)`\s*,\s*`([^`]+)`\s*\]/g,
                '$1'
            );

        /*
        抓剩餘所有文字
        */

        const parts =
            chunk.match(
/`([^`]+)`|[\u4E00-\u9FFF々ヶ]+/g
            ) || [];

        for(const p of parts){

            txt +=
                p
                .replace(/`/g,'');

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

        let cards =
            extractWords(
                songCode
            );

        /*
        stopword 過濾
        */

        cards =
            cards.filter(

                c=>

                !stopwords.includes(
                    c.word
                )

            );

        /*
        去重
        */

        const unique =
            [...new Map(

                cards.map(
                    c=>[
                        c.key,
                        c
                    ]
                )

            ).values()];

        log(
`生成字卡:${unique.length}`
        );

        log(

JSON.stringify(

    unique,

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

window.generate = generate;
