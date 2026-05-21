const logEl =
document.getElementById('log');

function log(msg){

    logEl.textContent+=msg+'\n';

}

async function loadJSON(path){

    const r=await fetch(path);

    return r.json();

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

function katakanaToHiragana(text){

    if(!text) return null;

    return text.replace(

        /[\u30a1-\u30f6]/g,

        s=>

        String.fromCharCode(
            s.charCodeAt(0)-0x60
        )

    );

}

function isEnglish(word){

    return /^[a-zA-Z0-9\s'".,!?\-_]+$/
        .test(word);

}

async function generate(){

    logEl.textContent='';

    const songPath=
        document
        .getElementById('songPath')
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
                rebuildLine(rawLine);

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
                    ].includes(t.pos)
                ){

                    continue;

                }

                const base=
                    (
                        t.basic_form &&
                        t.basic_form!=='*'
                    )
                    ?t.basic_form
                    :t.surface_form;

                if(
                    stopwords.includes(base)
                ){

                    continue;

                }

                if(
                    isEnglish(base)
                ){

                    continue;

                }

                let reading=null;

                if(t.reading){

                    if(
                        /^[ァ-ヶー]+$/
                        .test(
                            t.surface_form
                        )
                    ){

                        reading=t.reading;

                    }

                    else{

                        reading=
                        katakanaToHiragana(
                            t.reading
                        );

                    }

                }

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

                if(!exists){

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

window.generate=generate;
