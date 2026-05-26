const USER='yyxmeng';
const REPO='Jpop_romji';

let pending=[];
let cards=[];
let stopwords=[];

async function loadJSON(path){

    try{

        const r=
        await fetch(path);

        if(!r.ok){

            return [];
        }

        return await r.json();
    }

    catch{

        return [];
    }
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

        const json=
        await old.json();

        sha=
        json.sha;
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

        body.sha=
        sha;
    }

    const save=

    await fetch(

        api,

        {

            method:
            'PUT',

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
            path+
            ' 保存失敗'
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

                    resolve(
                        tokenizer
                    );
                }
            );
        }
    );
}

function mergeSource(

    target,
    source

){

    const exists=

    target.sources.some(

        s=>

        s.surface===source.surface
        &&
        s.line===source.line
    );

    if(
        !exists
    ){

        target.sources.push(
            source
        );
    }
}

async function batchGenerate(){

    const log=

    document
    .getElementById(
        'batchLog'
    );

    log.textContent=
    '開始批次生成...\n';

    const input=

    document
    .getElementById(
        'batchFolder'
    )
    .value
    .trim();

    if(
        !input
    ){

        alert(
'請輸入歌曲路徑'
        );

        return;
    }

    const tokenizer=
    await buildTokenizer();

    const dictionary=

    await loadJSON(
'data/dictionary.json'
    );

    const paths=

    input

    .split('\n')

    .map(

        s=>s.trim()
    )

    .filter(Boolean);

    let added=0;

    for(
        const path
        of paths
    ){

        try{

            log.textContent+=
`處理:${path}\n`;

            const songRes=

            await fetch(

'../'+path

            );

            const code=

            await songRes.text();

            const regex=
/L\s*\(\s*\[(.*?)\]\s*\)/gs;

            const lines=[];

            let m;

            while(

                (m=regex.exec(code))
                !==null

            ){

                lines.push(
                    m[1]
                );
            }

            for(
                const raw
                of lines
            ){

                let surface='';

                const tokenRegex=
/\[\s*`([^`]+)`\s*,\s*`([^`]+)`\s*\]|`([^`]+)`/g;

                let t;

                while(

                    (t=tokenRegex.exec(raw))
                    !==null

                ){

                    if(t[1]){

                        surface+=
                        t[1];
                    }

                    else{

                        surface+=
                        t[3];
                    }
                }

                const tokens=

                tokenizer.tokenize(
                    surface
                );

                for(
                    const tk
                    of tokens
                ){

                    if(

                        ![
                            '名詞',
                            '動詞',
                            '形容詞'
                        ]

                        .includes(
                            tk.pos
                        )

                    ){

                        continue;
                    }

                    if(

                        /^[a-zA-Z'.,]+$/
                        .test(
                            tk.surface_form
                        )

                    ){

                        continue;
                    }

                    let base=

                    tk.basic_form
                    &&
                    tk.basic_form!=='*'

                    ?

                    tk.basic_form

                    :

                    tk.surface_form;

                    let reading=

                    katakanaToHiragana(

                        tk.reading
                        ||
                        tk.surface_form

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

                        stopwords.some(

                            s=>

                            s.key===key

                        )

                    ){

                        continue;
                    }

                    const sourceObj={

                        surface:
                        tk.surface_form,

                        line:
                        surface
                    };

                    const inCards=

                    cards.find(

                        x=>

                        x.key===key
                    );

                    if(
                        inCards
                    ){

                        mergeSource(
                            inCards,
                            sourceObj
                        );

                        continue;
                    }

                    const inPending=

                    pending.find(

                        x=>

                        x.key===key
                    );

                    if(
                        inPending
                    ){

                        mergeSource(
                            inPending,
                            sourceObj
                        );

                        continue;
                    }

                    pending.push({

                        key,

                        word:
                        base,

                        reading,

                        type:
                        tk.pos,

                        sources:[
                            sourceObj
                        ]
                    });

                    added++;
                }
            }

        }

        catch(e){

            console.error(
                e
            );

            log.textContent+=
`失敗:${path}\n`;
        }
    }

    render();

    log.textContent+=
`\n完成\n新增:${added}`;
}

async function init(){

    pending=

    await loadJSON(
'data/pending.json'
    );

    cards=

    await loadJSON(
'data/cards.json'
    );

    stopwords=

    await loadJSON(
'data/stopwords.json'
    );

    render();
}

window.selectAll=
selectAll;

window.moveSelected=
moveSelected;

window.saveAll=
saveAll;

window.batchGenerate=
batchGenerate;

init();
