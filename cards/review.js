const OWNER=
'yyxmeng';

const REPO=
'Jpop_romji';

let pending=[];

let cards=[];

let stopwords=[];

let selected={

    pending:new Set(),

    cards:new Set(),

    stopwords:new Set()
};

let showExisting={

    cards:false,

    stopwords:false
};

async function loadJSON(path){

    try{

        const r=
        await fetch(path);

        if(
            !r.ok
        ){

            return [];
        }

        return await r.json();
    }

    catch{

        return [];
    }
}

function log(msg){

    document
    .getElementById(
        'batchLog'
    )
    .textContent
    +=
    msg+'\n';
}

function dedupe(arr){

    const map=
    new Map();

    for(
        const item
        of arr
    ){

        if(
            !item?.key
        ){

            continue;
        }

        map.set(
            item.key,
            item
        );
    }

    return[
        ...map.values()
    ];
}

function renderCard(item,type){

    const checked=

    selected[type]
    .has(
        item.key
    )

    ?'checked'
    :'';

    const sources=

    (
        item.sources
        ||
        []
    )

    .slice(
        0,
        3
    )

    .map(

        s=>

        `<div class="source">

        ${s.surface}

        <br>

        ${s.line}

        </div>`
    )

    .join('');

    return`

    <div class="card">

        <label>

            <input

            type="checkbox"

            ${checked}

            onchange="toggleItem(

                '${type}',

                '${item.key}'
            )"

            >

            <b>

            ${item.word}

            </b>

            【${item.reading}】

        </label>

        <div class="meta">

            ${item.type}

        </div>

        <div class="translateBox">

        <input
        
        class="translation"
        
        placeholder="中文翻譯"
        
        value="${
        item.translation
        ||''
        }"
        
        onchange="
        
        item.translation=
        this.value
        
        "
        
        >
        
        <input
        
        class="origin"
        
        placeholder="原詞"
        
        value="${
        item.origin
        ||''
        }"
        
        onchange="
        
        item.origin=
        this.value
        
        "
        
        >
        
        </div>

        ${sources}

    </div>

    `;
}

function render(){

    document
    .getElementById(
        'pendingCount'
    )
    .textContent=
    pending.length;

    document
    .getElementById(
        'cardsCount'
    )
    .textContent=
    cards.length;

    document
    .getElementById(
        'stopwordsCount'
    )
    .textContent=
    stopwords.length;

    document
    .getElementById(
        'pendingList'
    )
    .innerHTML=

    pending
    .map(

        x=>

        renderCard(
            x,
            'pending'
        )
    )
    .join('');

    document
    .getElementById(
        'cardsList'
    )
    .innerHTML=

    (

        showExisting.cards

        ?

        cards

        :

        cards.filter(
            x=>

            x._new
        )
    )

    .map(

        x=>

        renderCard(
            x,
            'cards'
        )
    )
    .join('');

    document
    .getElementById(
        'stopwordsList'
    )
    .innerHTML=

    (

        showExisting
        .stopwords

        ?

        stopwords

        :

        stopwords.filter(
            x=>

            x._new
        )
    )

    .map(

        x=>

        renderCard(
            x,
            'stopwords'
        )
    )
    .join('');
}

function toggleExisting(type){

    showExisting[type]=
    !showExisting[type];

    render();
}

function toggleItem(

    type,
    key

){

    if(

        selected[type]
        .has(
            key
        )

    ){

        selected[type]
        .delete(
            key
        );
    }

    else{

        selected[type]
        .add(
            key
        );
    }
}

function toggleSelect(type){

    const list=

    {
        pending,
        cards,
        stopwords
    }[type]

    ||[];

    const allSelected=

    list.length>0

    &&

    list.every(

        x=>

        selected[type]
        .has(
            x.key
        )
    );

    if(
        allSelected
    ){

        selected[type]
        .clear();
    }

    else{

        selected[type]=

        new Set(

            list.map(
                x=>
                x.key
            )
        );
    }

    render();
}

function moveSelected(

    from,
    to

){

    const source=

    {
        pending,
        cards,
        stopwords
    }[from]

    ||[];

    const target=

    {
        pending,
        cards,
        stopwords
    }[to]

    ||[];

    const keys=
    selected[from];

    const moved=

    source.filter(

        x=>

        keys.has(
            x.key
        )
    );

    const remain=

    source.filter(

        x=>

        !keys.has(
            x.key
        )
    );

    target.push(
        ...moved.map(

            x=>({

                ...x,

                _new:true
            })
        )
    );

    pending=

    from==='pending'
    ?remain
    :to==='pending'
    ?dedupe(target)
    :pending;

    cards=

    from==='cards'
    ?remain
    :to==='cards'
    ?dedupe(target)
    :cards;

    stopwords=

    from==='stopwords'
    ?remain
    :to==='stopwords'
    ?dedupe(target)
    :stopwords;

    selected[from]
    .clear();

    render();
}

async function init(){

    cards=
    await loadJSON(
        'data/cards.json'
    );

    pending=
    await loadJSON(
        'data/pending.json'
    );

    stopwords=
    await loadJSON(
        'data/stopwords.json'
    );

    cards=
    cards.map(

        x=>({

            ...x,

            _new:false
        })
    );

    stopwords=
    stopwords.map(

        x=>({

            ...x,

            _new:false
        })
    );

    pending=
    pending.map(

        x=>({

            ...x,

            _new:true
        })
    );

    render();
}

async function uploadGithub(

    path,
    data,
    token

){

    const api=

`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;

    let sha=null;

    const getRes=

    await fetch(

        api,

        {

            headers:{

                Authorization:
                `Bearer ${token}`,

                Accept:
                'application/vnd.github+json'
            }
        }
    );

    if(
        getRes.ok
    ){

        const old=
        await getRes.json();

        sha=
        old.sha;
    }

    const json=

    JSON.stringify(
        data,
        null,
        2
    );

    const content=

    btoa(

        new TextEncoder()

        .encode(json)

        .reduce(

            (
                s,
                b
            )=>

            s+
            String.fromCharCode(
                b
            ),

            ''
        )
    );

    const body={

        message:
        `update ${path}`,

        content
    };

    if(
        sha
    ){

        body.sha=
        sha;
    }

    const putRes=

    await fetch(

        api,

        {

            method:'PUT',

            headers:{

                Authorization:
                `Bearer ${token}`,

                Accept:
                'application/vnd.github+json',

                'Content-Type':
                'application/json'
            },

            body:
            JSON.stringify(
                body
            )
        }
    );

    if(
        !putRes.ok
    ){

        const err=
        await putRes.text();

        throw new Error(
            err
        );
    }
}

async function saveAll(){

    try{

        const token=

        document
        .getElementById(
            'githubToken'
        )
        .value
        .trim();

        if(!token){

            alert(
'請輸入GitHub token'
            );

            return;
        }

        console.log(
'開始上傳'
        );

        await uploadGithub(
            'cards/data/cards.json',
            cards,
            token
        );

        console.log(
'cards完成'
        );

        await uploadGithub(
            'cards/data/pending.json',
            pending,
            token
        );

        console.log(
'pending完成'
        );

        await uploadGithub(
            'cards/data/stopwords.json',
            stopwords,
            token
        );

        console.log(
'stopwords完成'
        );

        alert(
'GitHub更新成功'
        );
    }

    catch(e){

        console.error(e);

        alert(
e.message
        );
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

                    resolve(
                        tokenizer
                    );
                }
            );
        }
    );
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

async function translateWord(

    text,

    token

){

    if(
        !text
    ){

        return{

            translation:'',

            origin:''
        };
    }

    try{

        const res=

        await fetch(

`https://api.apify.com/v2/acts/yyxmeng~lyrics-translator/run-sync-get-dataset-items?token=${token}`,

            {

                method:'POST',

                headers:{

                    'Content-Type':
                    'application/json'
                },

                body:

                JSON.stringify({

                    text,

                    sourceLanguage:'ja',

                    targetLanguage:'zh-TW'
                })
            }
        );

        if(
            !res.ok
        ){

            throw new Error(
                await res.text()
            );
        }

        const data=
        await res.json();

        const result=

        Array.isArray(
            data
        )

        ?

        data[0]

        :

        data;

        const translation=

        result
        ?.translatedText
        ||

        '';

        const isKatakana=

        /^[ァ-ヶー]+$/
        .test(text);

        return{

            translation,

            origin:

            isKatakana

            ?

            text

            :

            ''
        };
    }

    catch(e){

        console.error(
            'translate失敗',
            e
        );

        return{

            translation:'',

            origin:''
        };
    }
}

async function batchGenerate(){

    log('');

    const apiToken=

    document
    .getElementById(
        'translateToken'
    )
    .value
    .trim();

    if(
        !apiToken
    ){

        alert(
'請輸入Apify Token'
        );

        return;
    }

    const raw=

    document
    .getElementById(
        'batchFolder'
    )
    .value
    .trim();

    if(!raw){

        return;
    }

    const files=

    raw
    .split('\n')
    .map(
        s=>
        s.trim()
    )
    .filter(Boolean);

    const stopwords=
    await loadJSON(
        'data/stopwords.json'
    );

    const dictionary=
    await loadJSON(
        'data/dictionary.json'
    );

    const tokenizer=
    await buildTokenizer();

    let added=0;

    for(
        const songPath
        of files
    ){

        try{

            log(
`處理:${songPath}`
            );

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
                        ]

                        .includes(
                            t.pos
                        )

                    ){

                        continue;
                    }

                    let base=

                    t.basic_form &&
                    t.basic_form!=='*'

                    ?

                    t.basic_form

                    :

                    t.surface_form;

                    let reading=

                    katakanaToHiragana(

                        t.reading
                        ||
                        t.surface_form
                    );

                    let translation='';
                    let origin='';
                    
                    const d=
                    dictionary[
                        base
                    ];
                    
                    if(
                        d
                    ){
                    
                        if(
                            d.word
                        ){
                    
                            base=
                            d.word;
                        }
                    
                        if(
                            d.reading
                        ){
                    
                            reading=
                            d.reading;
                        }
                    
                        if(
                            d.translation
                        ){
                    
                            translation=
                            d.translation;
                        }
                    
                        if(
                            d.origin
                        ){
                    
                            origin=
                            d.origin;
                        }
                    }

                    const key=
                    `${base}|${reading}`;

                    const blocked=

                    stopwords.some(

                        s=>

                        s.key===key
                    );

                    if(
                        blocked
                    ){

                        continue;
                    }

                    const existsCards=

                    cards.some(

                        x=>

                        x.key===key
                    );

                    const existsPending=

                    pending.some(

                        x=>

                        x.key===key
                    );

                    if(

                        existsCards
                        ||
                        existsPending

                    ){

                        continue;
                    }

                    log(
`翻譯:${base}`
                    );

                    let translated={
                    
                        translation,
                    
                        origin
                    };
                    
                    if(
                        !translation
                    ){
                    
                        translated=
                    
                        await translateWord(
                    
                            base,
                    
                            apiToken
                        );
                    }

                    pending.push({
                    
                        key,
                    
                        word:base,
                    
                        reading,
                    
                        translation:
                        translated.translation
                        ||'',
                    
                        origin:
                        translated.origin
                        ||'',
                    
                        type:t.pos,
                    
                        sources:[
                    
                            {
                    
                                surface:
                                t.surface_form,
                    
                                line:
                                line.surface
                            }
                        ],
                    
                        _new:true
                    });

                    added++;
                }
            }
        }

        catch(e){

            log(
`${songPath}失敗:${e.message}`
            );
        }
    }

    render();

    log(
`完成 新增${added}張`
    );
}

init();
