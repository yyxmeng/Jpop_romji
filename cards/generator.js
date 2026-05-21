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

function extractLyrics(code){

    const regex =
        /L\s*\(\s*\[(.*?)\]\s*\)/gs;

    const lines=[];

    let m;

    while(
        (m=regex.exec(code))
        !== null
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
        !== null
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

function buildTokenizer(){

    return new Promise(

        (resolve,reject)=>{

            kuromoji
            .builder({

                dicPath:'./dict'

            })

            .build(

                (err,tokenizer)=>{

                    if(err){

                        reject(err);
                        return;
                    }

                    resolve(tokenizer);
                }
            );
        }
    );
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

        log('請輸入歌曲路徑');
        return;
    }

    try{

        const stopwords=
            await loadJSON(
                'data/stopwords.json'
            );

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
            const rawLine
            of lyrics
        ){

            const line=
                rebuildLine(
                    rawLine
                );

            let rawTokens=
                tokenizer.tokenize(
                    line.surface
                );

            // 合併連續名詞

            const tokens=[];

            for(
                let i=0;
                i<rawTokens.length;
                i++
            ){

                let t=
                    rawTokens[i];

                if(

                    t.pos==="名詞"

                    &&

                    rawTokens[i+1]

                    &&

                    rawTokens[i+1].pos==="名詞"

                ){

                    let merged=
                        t.surface_form;

                    let reading=
                        t.reading||"";

                    while(

                        rawTokens[i+1]

                        &&

                        rawTokens[i+1].pos==="名詞"

                    ){

                        merged+=
                            rawTokens[
                                i+1
                            ].surface_form;

                        reading+=
                            rawTokens[
                                i+1
                            ].reading||"";

                        i++;
                    }

                    tokens.push({

                        ...t,

                        surface_form:
                            merged,

                        basic_form:
                            merged,

                        reading
                    });

                    continue;
                }

                tokens.push(t);
            }

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

/^[a-zA-Z'.]+$/

.test(

t.surface_form

)

                ){

                    continue;
                }

                const base=

                    t.basic_form

                    &&

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

                const blacklist=[

                    'れる',
                    'られる',
                    'する',
                    'いる',
                    'ある',
                    'なる',
                    'どる'

                ];

                if(

                    blacklist.includes(
                        base
                    )

                ){

                    continue;
                }

                const reading=

                    t.pronunciation
                    ||

                    t.reading
                    ||

                    null;

                const key=
                    `${base}|${reading}`;

                if(
                    !cards.has(key)
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
                    cards.get(key);

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
            }
        }

        const result=
            [...cards.values()];

        log(
`生成字卡:${result.length}`
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

window.generate=
generate;
