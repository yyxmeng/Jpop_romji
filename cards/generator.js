const logEl =
document.getElementById('log');

function log(msg){

    logEl.textContent+=msg+'\n';
}

async function loadJSON(path){

    try{

        const r=await fetch(path);

        if(!r.ok){

            return null;
        }

        return await r.json();
    }

    catch{

        return null;
    }
}

function extractLyrics(code){

    const regex=
    /L\s*\(\s*\[(.*?)\]\s*\)/gs;

    const lines=[];

    let m;

    while(
        (m=regex.exec(code))
        !==null
    ){

        lines.push(m[1]);
    }

    return lines;
}

function rebuildLine(line){

    let surface='';

    let reading='';

    const tokenRegex=
/\[\s*`([^`]+)`\s*,\s*`([^`]+)`\s*\]|`([^`]+)`/g;

    let m;

    while(
        (m=tokenRegex.exec(line))
        !==null
    ){

        if(m[1]){

            surface+=m[1];
            reading+=m[2];
        }

        else{

            surface+=m[3];
            reading+=m[3];
        }
    }

    return{

        surface:
        surface
        .replace(/\s+/g,' ')
        .trim(),

        reading:
        reading
        .replace(/\s+/g,' ')
        .trim()
    };
}

function katakanaToHiragana(str){

    if(!str)return null;

    return str.replace(

        /[\u30a1-\u30f6]/g,

        s=>

        String.fromCharCode(
            s.charCodeAt(0)-0x60
        )
    );
}

function buildTokenizer(){

    return new Promise(

        (resolve,reject)=>{

            kuromoji
            .builder({

                dicPath:'dict'

            })

            .build(

                (err,tokenizer)=>{

                    if(err){

                        reject(err);

                        return;
                    }

                    resolve(
                        tokenizer
                    );
                }
            );
        }
    );
}

function downloadFile(

    filename,
    data

){

    const blob=
    new Blob(

        [
            JSON.stringify(
                data,
                null,
                2
            )
        ],

        {
            type:
            'application/json'
        }
    );

    const url=
    URL.createObjectURL(
        blob
    );

    const a=
    document
    .createElement('a');

    a.href=url;

    a.download=
    filename;

    a.click();

    URL.revokeObjectURL(
        url
    );
}

function uniquePending(list){

    const map=new Map();

    for(const p of list){

        const key=
        `${p.word}|${p.reading}`;

        if(!map.has(key)){

            map.set(key,p);
        }
    }

    return [...map.values()];
}

async function generate(){

    logEl.textContent='';

    const songPath=

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

        const stopwords=
        await loadJSON(
'data/stopwords.json'
        )||[];

        const dictionary=
        await loadJSON(
'data/dictionary.json'
        )||{};

        const existingCards=
        await loadJSON(
'data/cards.json'
        )||[];

        const existingPending=
        await loadJSON(
'data/pending.json'
        )||[];

        const tokenizer=
        await buildTokenizer();

       const songRes=
       await fetch(
            '../'+songPath
        );

        const songCode=
        await songRes.text();

        const lyrics=
        extractLyrics(
            songCode
        );

        log(
`歌詞行數:${lyrics.length}`
        );

        const cards=
        new Map();

        for(
            const oldCard
            of existingCards
        ){

            cards.set(
                oldCard.key,
                oldCard
            );
        }

        const pending=[
            ...existingPending
        ];

        for(
            const rawLine
            of lyrics
        ){

            const line=
            rebuildLine(
                rawLine
            );

            const tokens=
            tokenizer.tokenize(
                line.surface
            );

            for(
                const t
                of tokens
            ){

                if(
                    ![
                        '名詞',
                        '動詞',
                        '形容詞'
                    ].includes(
                        t.pos
                    )
                ){

                    continue;
                }

                if(
                    /^[a-zA-Z'.,!?-]+$/
                    .test(
                        t.surface_form
                    )
                ){

                    continue;
                }

                if(
                    /^[',.!?]+$/
                    .test(
                        t.surface_form
                    )
                ){

                    continue;
                }

                let base=

                t.basic_form &&
                t.basic_form!=='*'

                ?t.basic_form
                :t.surface_form;

                if(
                    stopwords.includes(
                        base
                    )
                ){

                    continue;
                }

                let reading=

                katakanaToHiragana(

                    t.reading
                    ||
                    t.surface_form

                );

                const dictRule=

                dictionary[base]

                ||

                dictionary[
                    t.surface_form
                ];

                if(
                    dictRule
                ){

                    if(
                        dictRule.word
                    ){

                        base=
                        dictRule.word;
                    }

                    if(
                        dictRule.reading
                    ){

                        reading=
                        katakanaToHiragana(
                            dictRule.reading
                        );
                    }
                }

                const key=
                `${base}|${reading}`;

                if(
                    !cards.has(
                        key
                    )
                ){

                    cards.set(

                        key,

                        {

                            key,

                            word:base,

                            reading,

                            type:t.pos,

                            sources:[]
                        }
                    );
                }

                const card=
                cards.get(
                    key
                );

                const sourceObj={

                    surface:
                    t.surface_form,

                    line:
                    line.surface
                };

                const exists=

                card.sources.some(

                    s=>

                    s.surface===
                    sourceObj.surface

                    &&

                    s.line===
                    sourceObj.line
                );

                if(
                    !exists
                ){

                    card.sources.push(
                        sourceObj
                    );
                }

                if(

                    !dictRule

                    &&

                    /[ァ-ヶ]/.test(
                        t.surface_form
                    )

                ){

                    pending.push({

                        word:base,

                        reading
                    });
                }
            }
        }

        const result=
        [...cards.values()];

        const finalPending=
        uniquePending(
            pending
        );

        log(
`生成字卡:${result.length}`
        );

        log(
`pending:${finalPending.length}`
        );

        log(
'Phase3完成：合併/補建模式啟用'
        );

        log(

            
JSON.stringify(
result,
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

downloadFile(
    'cards.json',
    result
);

downloadFile(
    'pending.json',
    finalPending
);

log(
'下載完成'
);

window.generate=
generate;
