const USER='yyxmeng';
const REPO='Jpop_romji';

let pending=[];
let cards=[];
let stopwords=[];

async function loadJSON(path){

    const r=
    await fetch(path);

    return await r.json();
}

function render(){

    renderColumn(
        'pending',
        pending
    );

    renderColumn(
        'cards',
        cards
    );

    renderColumn(
        'stopwords',
        stopwords
    );

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
}

function renderColumn(

    name,
    arr

){

    const el=
    document
    .getElementById(
        name+'List'
    );

    el.innerHTML='';

    for(
        const item
        of arr
    ){

        const div=
        document
        .createElement(
            'div'
        );

        div.className=
        'card';

        div.innerHTML=`

<label>

<input
type="checkbox"
class="check-${name}"
value="${item.key}">

<b>
${item.word}
</b>

(${item.reading})

</label>

<div class="meta">

${item.type||''}

</div>

<div class="source">

${

(item.sources||[])

.slice(0,3)

.map(

s=>

`${s.surface}
｜${s.line}`

)

.join(
'<br>'
)

}

</div>
`;

        el.appendChild(
            div
        );
    }
}

function selectAll(name){

    document
    .querySelectorAll(

        `.check-${name}`

    )

    .forEach(

        c=>

        c.checked=true
    );
}

function moveSelected(

    from,
    to

){

    const checked=

    [

        ...

        document
        .querySelectorAll(

            `.check-${from}:checked`

        )

    ]

    .map(

        x=>x.value
    );

    if(
        !checked.length
    ){

        return;
    }

    const src=
    window[from];

    const dst=
    window[to];

    const moving=

    src.filter(

        x=>

        checked.includes(
            x.key
        )
    );

    window[from]=

    src.filter(

        x=>

        !checked.includes(
            x.key
        )
    );

    const map=
    new Map();

    for(
        const x
        of dst
    ){

        map.set(
            x.key,
            x
        );
    }

    for(
        const x
        of moving
    ){

        map.set(
            x.key,
            x
        );
    }

    window[to]=
    [...map.values()];

    render();
}

async function githubSave(

    path,
    data,
    token

){

    const api=

`https://api.github.com/repos/${USER}/${REPO}/contents/${path}`;

    let sha=null;

    const get=

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
        get.ok
    ){

        const old=

        await get.json();

        sha=
        old.sha;
    }

    const body={

        message:
`review update ${path}`,

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

        body.sha=sha;
    }

    const save=

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
        !save.ok
    ){

        throw new Error(
            path+' 保存失敗'
        );
    }
}

async function saveAll(){

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
'請輸入GitHub Token'
        );

        return;
    }

    try{

        await githubSave(

            'cards/data/cards.json',

            cards,

            token
        );

        await githubSave(

            'cards/data/pending.json',

            pending,

            token
        );

        await githubSave(

            'cards/data/stopwords.json',

            stopwords,

            token
        );

        alert(
'GitHub更新完成'
        );
    }

    catch(e){

        console.error(e);

        alert(
e.message
        );
    }
}

async function init(){

    pending=

    await loadJSON(
'../data/pending.json'
    );

    cards=

    await loadJSON(
'../data/cards.json'
    );

    stopwords=

    await loadJSON(
'../data/stopwords.json'
    );

    render();
}

init();

window.selectAll=
selectAll;

window.moveSelected=
moveSelected;

window.saveAll=
saveAll;