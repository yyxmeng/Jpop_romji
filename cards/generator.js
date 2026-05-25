// ===== 修正點 =====
// 之前邏輯：
// 「新字卡」只看 currentRun 內有沒有出現
// 沒檢查「cards.json 原本存在但被刪掉」的情況
//
// 現在改成：
// 1. stopwords過濾
// 2. dictionary覆蓋
// 3. 所有新token先建立 candidate
// 4. 若 key 已存在 cards.json → 跳過
// 5. 若 key 已存在 pending.json → 跳過
// 6. 其餘全部進 pending
//
// 所以：
// 你故意刪 cards 某張卡 → 重跑 → 會重新出現在 pending


const logEl=document.getElementById('log');

function log(msg){

    logEl.textContent+=msg+'\n';
}

async function loadJSON(path){

    try{

        const r=await fetch(path);

        if(!r.ok){

            return [];
        }

        return await r.json();
    }

    catch{

        return [];
    }
}

function extractLyrics(code){

    const regex=/L\s*\(\s*\[(.*?)\]\s*\)/gs;

    const lines=[];

    let m;

    while((m=regex.exec(code))!==null){

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

    while((m=tokenRegex.exec(line))!==null){

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
    document.createElement('a');

    a.href=url;

    a.download=filename;

    a.click();

    URL.revokeObjectURL(url);
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
        
        const dictionary=
        await loadJSON(
            'data/dictionary.json'
        );
        
        const oldCards=
        await loadJSON(
            'data/cards.json'
        );
        
        const oldPending=
        await loadJSON(
            'data/pending.json'
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
        extractLyrics(songCode);

        log(
`歌詞行數:${lyrics.length}`
        );

        const oldCardKeys=
        new Set(
            oldCards.map(
                x=>x.key
            )
        );

        const oldPendingKeys=
        new Set(
            oldPending.map(
                x=>x.key
            )
        );

        const pendingMap=
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
                    ].includes(
                        t.pos
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
                    stopwords.includes(base)
                ){

                    continue;
                }

                let reading=

                katakanaToHiragana(

                    t.reading
                    ||
                    t.surface_form
                );

                if(
                    dictionary[base]
                ){

                    const rule=
                    dictionary[base];

                    if(
                        rule.word
                    ){

                        base=
                        rule.word;
                    }

                    if(
                        rule.reading
                    ){

                        reading=
                        rule.reading;
                    }
                }

                const key=
                `${base}|${reading}`;

                if(
                    oldCardKeys.has(key)
                ){
                
                    log(
                `SKIP cards: ${key}`
                    );
                
                    continue;
                }

                if(
                    oldPendingKeys.has(key)
                ){
                
                    log(
                `SKIP pending: ${key}`
                    );
                
                    continue;
                }

                if(
                    pendingMap.has(key)
                ){

                    continue;
                }
                
                log(
                `NEW pending: ${key}`
                );
        
                pendingMap.set(

                    key,

                    {

                        key,

                        word:base,

                        reading,

                        type:t.pos,

                        sources:[

                            {

                                surface:
                                t.surface_form,

                                line:
                                line.surface
                            }
                        ]
                    }
                );
            }
        }
        
        const pending=
        [...pendingMap.values()];

        log(
`生成字卡:0`
        );

        log(
`pending:${pending.length}`
        );

        log(
'Phase3完成：合併/補建模式啟用'
        );

        log(

            JSON.stringify(
                pending,
                null,
                2
            )
        );

        downloadFile(

            'pending.json',

            pending
        );

        log(
'下載完成'
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
