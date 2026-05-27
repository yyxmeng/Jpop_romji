const OWNER='yyxmeng';
const REPO='Jpop_romji';

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

        const r=await fetch(path);

        if(!r.ok){
            return [];
        }

        return await r.json();

    }catch{

        return [];
    }
}

function log(msg){

    document
    .getElementById('batchLog')
    .textContent+=msg+'\n';
}

function dedupe(arr){

    const map=new Map();

    for(const item of arr){

        if(!item?.key){
            continue;
        }

        map.set(item.key,item);
    }

    return [...map.values()];
}

function isKatakana(word){

    return /^[ァ-ヶー]+$/.test(word||'');
}

function renderCard(item,type){

    const checked=

    selected[type]
    .has(item.key)

    ?

    'checked'

    :

    '';

    const list={
        pending,
        cards,
        stopwords
    }[type];

    const sources=

    (item.sources||[])

    .slice(0,3)

    .map(s=>`

        <div class="source">

            ${s.surface}

            <br>

            ${s.line}

        </div>

    `)

    .join('');

    const originBox=

    isKatakana(item.word)

    ?

    `

    <input

    class="origin"

    placeholder="原詞"

    value="${item.origin||''}"

    onchange="

    ${type}.find(

        x=>x.key==='${item.key}'

    ).origin=this.value

    "

    >

    `

    :

    '';

    return `

    <div class="card">

        <label>

            <input

            type="checkbox"

            ${checked}

            onchange="

            toggleItem(

                '${type}',

                '${item.key}'

            )

            "

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

            value="${item.translation||''}"

            onchange="

            ${type}.find(

                x=>x.key==='${item.key}'

            ).translation=this.value

            "

            >

            ${originBox}

        </div>

        ${sources}

    </div>

    `;
}

function render(){

    document
    .getElementById('pendingCount')
    .textContent=pending.length;

    document
    .getElementById('cardsCount')
    .textContent=cards.length;

    document
    .getElementById('stopwordsCount')
    .textContent=stopwords.length;

    document
    .getElementById('pendingList')
    .innerHTML=

    pending
    .map(

        x=>renderCard(
            x,
            'pending'
        )

    )
    .join('');

    document
    .getElementById('cardsList')
    .innerHTML=

    (

        showExisting.cards

        ?

        cards

        :

        cards.filter(
            x=>x._new
        )

    )

    .map(

        x=>renderCard(
            x,
            'cards'
        )

    )

    .join('');

    document
    .getElementById('stopwordsList')
    .innerHTML=

    (

        showExisting.stopwords

        ?

        stopwords

        :

        stopwords.filter(
            x=>x._new
        )

    )

    .map(

        x=>renderCard(
            x,
            'stopwords'
        )

    )

    .join('');
}

async function batchGenerate(){

    log('');

    const raw=
    document
    .getElementById('batchFolder')
    .value
    .trim();

    if(!raw){
        return;
    }

    const files=

    raw
    .split('\n')
    .map(s=>s.trim())
    .filter(Boolean);

    const dictionary=
    await loadJSON(
        'data/dictionary.json'
    );

    const stopwordData=
    await loadJSON(
        'data/stopwords.json'
    );

    const tokenizer=
    await buildTokenizer();

    let added=0;

    for(const songPath of files){

        try{

            log(`處理:${songPath}`);

            const songRes=
            await fetch('../'+songPath);

            const songCode=
            await songRes.text();

            const lyrics=
            extractLyrics(songCode);

            for(const rawLine of lyrics){

                const line=
                rebuildLine(rawLine);

                const tokens=
                tokenizer.tokenize(
                    line.surface
                );

                for(const t of tokens){

                    if(
                        ![
                            '名詞',
                            '動詞',
                            '形容詞'
                        ]
                        .includes(t.pos)
                    ){
                        continue;
                    }

                    let base=

                    t.basic_form
                    &&
                    t.basic_form!=='*'

                    ?

                    t.basic_form

                    :

                    t.surface_form;

                    let reading=

                    katakanaToHiragana(

                        t.pronunciation
                        ||
                        t.reading
                        ||
                        base
                    );

                    let translation='';
                    let origin='';

                    const d=
                    dictionary[base];

                    if(d){

                        if(d.word){
                            base=d.word;
                        }

                        if(d.reading){
                            reading=d.reading;
                        }

                        if(d.translation){
                            translation=d.translation;
                        }

                        if(d.origin){
                            origin=d.origin;
                        }
                    }

                    if(
                        isKatakana(base)
                        &&
                        !origin
                    ){
                        origin=base;
                    }

                    const key=
                    `${base}|${reading}`;

                    const blocked=

                    stopwordData.some(
                        s=>s.key===key
                    );

                    if(blocked){
                        continue;
                    }

                    const sourceInfo={

                        surface:
                        t.surface_form,

                        line:
                        line.surface,

                        id:
                        songPath
                        .split('/')
                        .pop()
                        ?.replace('.js',''),

                        artist:
                        songPath
                        .split('/')[1]
                        ||'',

                        name:
                        songPath
                        .split('/')
                        .pop()
                        ?.replace('.js','')
                        ||''
                    };

                    let target=

                    cards.find(
                        x=>x.key===key
                    )

                    ||

                    pending.find(
                        x=>x.key===key
                    );

                    if(target){

                        const existsSource=

                        (target.sources||[])
                        .some(

                            s=>

                            s.line===
                            sourceInfo.line

                        );

                        if(!existsSource){

                            target.sources.push(
                                sourceInfo
                            );
                        }

                        continue;
                    }

                    pending.push({

                        key,

                        word:base,

                        reading,

                        translation,

                        origin,

                        type:t.pos,

                        sources:[
                            sourceInfo
                        ],

                        _new:true
                    });

                    added++;
                }
            }

        }catch(e){

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

            translation:'',

            origin:'',

            ...x,

            sources:
            x.sources||[],

            _new:false
        })
    );

    pending=

    pending.map(

        x=>({

            translation:'',

            origin:'',

            ...x,

            sources:
            x.sources||[],

            _new:true
        })
    );

    stopwords=

    stopwords.map(

        x=>({

            translation:'',

            origin:'',

            ...x,

            _new:false
        })
    );

    render();
}

init();
