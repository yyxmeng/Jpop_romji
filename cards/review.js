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

    try{

        const old=

        await fetch(

            api,

            {

                headers:{

                    Authorization:
                    `Bearer ${token}`
                }
            }
        );

        if(
            old.ok
        ){

            sha=
            (
                await old.json()
            )
            .sha;
        }
    }

    catch{}

    const body={

        message:
        `update ${path}`,

        content:

        btoa(

            unescape(

                encodeURIComponent(

                    JSON.stringify(

                        data,
                        null,
                        2
                    )
                )
            )
        )
    };

    if(
        sha
    ){

        body.sha=
        sha;
    }

    const r=

    await fetch(

        api,

        {

            method:'PUT',

            headers:{

                Authorization:
                `Bearer ${token}`,

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
        !r.ok
    ){

        throw new Error(
            path+
            ' upload failed'
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

        if(
            !token
        ){

            alert(
'請輸入GitHub token'
            );

            return;
        }

        await uploadGithub(

            'data/cards.json',

            dedupe(cards),

            token
        );

        await uploadGithub(

            'data/pending.json',

            dedupe(pending),

            token
        );

        await uploadGithub(

            'data/stopwords.json',

            dedupe(stopwords),

            token
        );

        alert(
'保存成功'
        );
    }

    catch(e){

        console.error(e);

        alert(
'保存失敗'
        );
    }
}

async function batchGenerate(){

    log('');

    const raw=

    document
    .getElementById(
        'batchFolder'
    )
    .value
    .trim();

    if(
        !raw
    ){

        return;
    }

    const files=

    raw

    .split('\n')

    .map(
        x=>
        x.trim()
    )

    .filter(Boolean);

    log(
`開始生成:${files.length}首`
    );

    for(
        const f
        of files
    ){

        try{

            log(
`處理:${f}`
            );

        }

        catch(e){

            log(
`失敗:${f}`
            );
        }
    }

    log(
'批次完成'
    );
}

init();
