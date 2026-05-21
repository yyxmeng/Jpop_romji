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

function extractWords(text){

    const found = new Set();

    /*
    漢字＋送り仮名
    飛び立つ
    差し出された
    描ける
    */

    const kanjiWordRegex =
/[\u4E00-\u9FFF々ヶ]+(?:[ぁ-んー]*)+/g;

    /*
    純漢字複合詞
    人生
    文化
    大地
    */

    const pureKanjiRegex =
/[\u4E00-\u9FFF々ヶ]{2,}/g;

    /*
    片假名
    */

    const katakanaRegex =
/[\u30A0-\u30FFー]{2,}/g;

    [
        kanjiWordRegex,
        pureKanjiRegex,
        katakanaRegex
    ].forEach(regex=>{

        const matches =
            text.match(regex)
            || [];

        matches.forEach(
            w=>found.add(w)
        );

    });

    return [...found];
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
        .getElementById('songPath')
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
                '../' + songPath
            );

        const songCode =
            await songRes.text();

        const lyrics =
            extractLyrics(songCode);

        log(
            `歌詞行數:${lyrics.length}`
        );

        let cards = [];

        for(const line of lyrics){

            const words =
                extractWords(line);

            for(const word of words){

                if(
                    stopwords.includes(word)
                ){
                    continue;
                }

                const type =
                    containsKanji(word)
                    ? 'kanji'
                    : 'katakana';

                cards.push({

                    key:word,

                    word,

                    type,

                    source:line
                });
            }
        }

        cards =
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
            '失敗:' + e.message
        );
    }
}

window.generate = generate;
