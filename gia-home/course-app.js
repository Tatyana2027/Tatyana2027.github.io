const stage = document.querySelector('#stage');
const dots = document.querySelector('#steps');
const next = document.querySelector('#next');
const previous = document.querySelector('#previous');
const position = document.querySelector('#position');
const title = 'Get Involved! ' + course.label;
let storageKey;
let saved = {};
let current = 0;
let done = new Set();
let panels = [];
let dotButtons = [];
let summary;
let assessedSteps=0;
let completion;

function el(tag, text = '', classes = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = classes;
  return node;
}
function btn(text, click, classes) {
  const node = el('button', text, classes);
  node.type = 'button';
  node.addEventListener('click', click);
  return node;
}
function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify({...saved, done:[...done]})); } catch {}
}
function finishStep(key) {
  done.add(key);
  persist();
  paint();
}
function status() {
  const node = el('p','','feedback');
  node.setAttribute('role','status');
  return node;
}
let activeTrack;
function stopAudio() {
  window.speechSynthesis?.cancel();
  if (activeTrack) {
    activeTrack.pause();
    activeTrack = undefined;
  }
}
async function playTrack(name, feedback) {
  stopAudio();
  const track = new Audio('audio/' + name.toLowerCase() + '.mp3');
  activeTrack = track;
  feedback.textContent = '';
  try {
    await track.play();
  } catch {
    if (activeTrack === track) feedback.textContent = 'Запись не открылась. Нажми «Послушать» ещё раз.';
  }
}
function speak(text, feedback) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    feedback.textContent = 'Озвучка недоступна на этом устройстве.';
    return;
  }
  stopAudio();
  const audio = new SpeechSynthesisUtterance(text);
  audio.lang = 'en-GB';
  audio.rate = .86;
  audio.onerror = event => {
    if (!['canceled','interrupted'].includes(event.error)) feedback.textContent = 'Озвучка недоступна на этом устройстве.';
  };
  window.speechSynthesis.speak(audio);
}
function quiz(root, key, questions) {
  const correct = new Set();
  questions.forEach(([question, choices, answer, why], index) => {
    const item = el('section','','sheet');
    const actions = el('div','','actions');
    const feedback = status();
    choices.forEach(choice => actions.append(btn(choice, event => {
      const picked = event.currentTarget;
      for (const option of actions.children) option.classList.remove('wrong');
      if (choice !== answer) {
        picked.classList.add('wrong');
        feedback.className = 'feedback error';
        feedback.textContent = 'Попробуй ещё раз. ' + why;
        return;
      }
      picked.classList.add('right');
      for (const option of actions.children) option.disabled = true;
      feedback.className = 'feedback success';
      feedback.textContent = '✓ ' + why;
      correct.add(index);
      if (correct.size === questions.length) finishStep(key);
    })));
    item.append(el('p',question),actions,feedback);
    root.append(item);
  });
}
function writing(root, key, items) {
  const correct = new Set();
  const normalize = text => text.toLowerCase().trim().replace(/[’‘]/g,"'").replace(/\s+/g,' ').replace(/[.?!]$/,'');
  items.forEach(([prompt, answers], index) => {
    const form = el('form','','sheet');
    const input = el('input');
    input.id = key + '-answer-' + index;
    input.lang = 'en';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.required = true;
    const label = el('label',prompt);
    label.htmlFor = input.id;
    const feedback = status();
    feedback.id = input.id + '-feedback';
    input.setAttribute('aria-describedby',feedback.id);
    const check = el('button','Проверить','primary');
    input.addEventListener('input', () => {input.removeAttribute('aria-invalid');feedback.textContent='';});
    form.addEventListener('submit', event => {
      event.preventDefault();
      const typed = normalize(input.value);
      if (!answers.some(answer => normalize(answer) === typed)) {
        input.setAttribute('aria-invalid','true');
        feedback.className = 'feedback error';
        feedback.textContent = 'Правильно: ' + answers[0] + '. Введи ответ ещё раз.';
        input.focus();
        return;
      }
      input.readOnly = true;
      check.disabled = true;
      feedback.className = 'feedback success';
      feedback.textContent = '✓ Верно!';
      correct.add(index);
      if (correct.size === items.length) finishStep(key);
    });
    form.append(label,input,check,feedback);
    root.append(form);
  });
}


function vocabularyGroup(unit,kind) {
  return kind==='vocab'?unit.vocabularyGroups?.[0]:kind==='vocab2'?unit.vocabularyGroups?.[1]:undefined;
}
function vocabularySteps(unit,kind) {
  const group=vocabularyGroup(unit,kind);
  const start=kind==='vocab'?0:6;
  const end=kind==='vocab'?6:undefined;
  return wordSteps(group?.words??unit.words.slice(start,end),
    group?.contexts??unit.contexts.slice(start,end),kind==='vocab2'?unit.wordPartners:undefined);
}
function reviewVocabulary(unit) {
  if(!unit.vocabularyGroups)return unit.words.slice(0,6);
  return unit.vocabularyGroups.flatMap(group=>group.words.filter((_,i)=>i%3===0));
}

const groups = [{id:'starter', title:'Starter · What do you know?', lessons:[
  {id:'st-l1', title:course.id==='gia2plus'?'Meet two students':'My favourite things', kind:'external'},
  ...course.starter.map((item,index)=>({...item,id:'st-l'+(index+2),kind:'starter'}))
]}];
const lessonKinds = [
  ['vocab','Vocabulary'], ['reading','Reading'], ['grammar1','Grammar 1'],
  ['vocab2','Vocabulary 2'], ['grammar2','Grammar 2'], ['listening','Listening & speaking'],
  ['writing','Writing & project'], ['test','Unit test']
];
for (const [index,unit] of course.units.entries()) {
  const number=index+1;
  groups.push({id:'u'+number,title:'Unit '+number+' · '+unit.title,topic:unit.topic,lessons:lessonKinds.map(([kind,label],at)=>({
    id:'u'+number+'-'+(kind==='test'?'test':'l'+(at+1)),kind,unit,number,
    title:vocabularyGroup(unit,kind)?.title??(kind==='grammar1'?unit.grammar[0].title:kind==='grammar2'?unit.grammar[1].title:label),
    source:'Student’s Book · Unit '+number+' · с. '+(vocabularyGroup(unit,kind)?.page??(unit.page+'–'+(unit.page+11)))
  }))});
}
groups.push({id:'u9',title:'Unit 9 · Look what you know!',lessons:Array.from({length:4},(_,index)=>({
  id:'u9-l'+(index+1),kind:'review',units:course.units.slice(index*2,index*2+2),
  title:'Review · Units '+(index*2+1)+'–'+(index*2+2),source:'Student’s Book · Unit 9 · с. 108–115'
}))});
const request=new URLSearchParams(location.search).get('lesson');
const entry=groups.flatMap(group=>group.lessons).find(item=>item.id===request);
const href=item=>item.kind==='external'?'st-l1/':'?lesson='+item.id;
function link(text,url,classes='') {
  const a=el('a',text,classes);a.href=url;return a;
}
function copyButton(url, feedback, label='🔗 Скопировать ссылку') {
  return btn(label,async ()=>{
    const address=new URL(url,location.href).href;
    try { await navigator.clipboard.writeText(address);feedback.textContent='Ссылка скопирована.'; }
    catch {
      const field=el('input');field.value=address;field.readOnly=true;
      field.setAttribute('aria-label','Адрес урока');
      feedback.replaceChildren(field);field.focus();field.select();
    }
  });
}
function showCatalog() {
  const catalog=el('section','','catalog');
  catalog.append(el('h1',title),el('p','Домашние уроки · выбери раздел','lead'));
  if (request && !entry)catalog.append(el('p','Урок по этой ссылке не найден.'));
  for (const group of groups) {
    const box=el('details');box.id=group.id;box.open=location.hash==='#'+group.id;
    const label=group.title+' · '+(group.lessons.at(-1).kind==='test'?'7 уроков + тест':group.lessons.length+' урока');
    box.append(el('summary',label));
    if(group.topic)box.append(el('p',group.topic));
    for(const item of group.lessons){
      const row=el('div','','sheet catalog-row');const column=el('div');
      const feedback=status();const copy=copyButton(href(item),feedback,'🔗');
      copy.setAttribute('aria-label','Скопировать ссылку: '+item.title);
      column.append(copy,feedback);
      row.append(link(item.title,href(item)),column);box.append(row);
    }
    catalog.append(box);
  }
  const foot=el('p','','source-note');
  foot.append('Авторская онлайн-практика по ',link('программе Macmillan',course.source),'.');
  catalog.append(foot,link('← Все курсы','../../','catalog-return'));
  stage.append(catalog);
}

function card(root,text,lang='en') {
  const piece=el('article','','sheet article-copy');const p=el('p',text);p.lang=lang;
  piece.append(p);root.append(piece);return piece;
}
function choices(questions) {
  return questions.map(([prompt,right,...wrong],index)=>{
    const options=wrong.slice();
    options.splice((index+1)% (wrong.length+1),0,right);
    return [prompt,options,right,'Правильный ответ: '+right];
  });
}
function wordItems(words) {
  return words.map(([english,russian],index)=>['Как сказать «'+russian+'»?',english,words[(index+1)%words.length][0],words[(index+3)%words.length][0]]);
}
function grammarItems(grammar) {
  return grammar.items.map(([prompt,right,wrong])=>[prompt,right,...wrong.split(',')]);
}
function wordChallenge(root,words,contexts) {
  const round=el('section','','sheet');
  const feedback=status();
  const counter=el('strong');
  const prompt=el('p');prompt.lang='en';
  const bank=el('div','','actions');
  let index=0;
  let misses=0;
  let attempted=false;
  let solved=false;
  function draw() {
    if(index===words.length) {
      const result=el('strong','Раунд закончен: '+(words.length-misses)+' из '+words.length+' с первой попытки.');
      const retry=btn('Сыграть ещё раз',()=>{
        index=0;misses=0;
        round.replaceChildren(counter,prompt,bank,feedback);
        draw();
      });
      round.replaceChildren(result,el('div','','actions'));
      round.lastElementChild.append(retry);
      finishStep('challenge');return;
    }
    counter.textContent='Раунд '+(index+1)+' из '+words.length;
    prompt.textContent=contexts[index];
    feedback.textContent='';
    attempted=false;solved=false;
    const distractors=words.slice(index+1).concat(words.slice(0,index)).slice(0,5);
    const order=distractors.slice();
    order.splice((index*3+1)%(distractors.length+1),0,words[index]);
    bank.replaceChildren(...order.map(([word,translation])=>btn(word,event=>{
      if(solved)return;
      const picked=event.currentTarget;
      const [right,meaning]=words[index];
      if(word!==right) {
        if(!attempted)misses++;
        attempted=true;picked.disabled=true;picked.classList.add('wrong');
        feedback.className='feedback error';
        feedback.textContent='«'+word+'» означает «'+translation+'». Здесь нужно слово со значением «'+meaning+'».';
        return;
      }
      solved=true;
      for(const option of bank.querySelectorAll('button'))option.disabled=true;
      picked.classList.add('right');
      feedback.className='feedback success';
      feedback.textContent='✓ '+contexts[index].replace('___',right);
      const forward=btn(index+1===words.length?'Результат':'Следующий раунд →',()=>{
        forward.remove();index++;draw();
        const focusTarget=bank.querySelector('button:not([disabled])');
        focusTarget?.focus();
      },'primary');
      round.append(forward);
    })));
  }
  round.append(counter,prompt,bank,feedback);
  root.append(round);draw();
}
function wordSteps(words, contexts, partners) {
  const steps = [
    ['words','Карточки','Послушай выражения и прочитай перевод.',root=>{
      const grid=el('div','','grid');const heard=new Set();
      words.forEach(([word,translation],index)=>{
        const tile=el('article','','sheet');const feedback=status();
        tile.append(btn('🔊 '+word,()=>{speak(word,feedback);heard.add(index);if(heard.size===words.length)finishStep('words');}),
          el('p',translation),feedback);grid.append(tile);
      });root.append(grid);
    }],
    ['meaning','Значение слов','Выбери подходящий перевод.',root=>quiz(root,'meaning',choices(wordItems(words)))],
    ['spell','Напиши по-английски','Впиши выражения. При ошибке карточка покажет исправление.',root=>
      writing(root,'spell',words.slice(0,4).map(([english,russian])=>['«'+russian+'»',[english]]))]
  ];
  if (contexts) {
    if (partners?.length) steps.push(['partners','Слова-партнёры','Выбери слово, чтобы получилось естественное сочетание.',root=>
      quiz(root,'partners',choices(partners))]);
    steps.push(
      ['challenge','Лексическая игра','В каждом раунде подбери выражение к ситуации. После ошибки появится подсказка.',root=>wordChallenge(root,words,contexts)],
      ['contextWrite','Лексика без подсказок','Впиши выражение в предложение. Проверь написание и смысл.',root=>
        writing(root,'contextWrite',contexts.map((prompt,index)=>[prompt,[words[index][0]]]))]
    );
    if (partners?.length) steps.push(['wordBuilding','Семьи слов','Выбери нужную часть речи по контексту.',root=>
      writing(root,'wordBuilding',[
        ['The team hopes to ___ an affordable device. (invention)',['invent']],
        ['The student’s ___ was displayed at the fair. (invent)',['invention']],
        ['An ___ can improve an existing idea. (invent)',['inventor']],
        ['A ___ asked the cyclists to keep a record. (research)',['researcher']],
        ['They carried out more ___ before changing the design. (researcher)',['research']]
      ])]);

  }
  return steps;
}
function grammarSteps(grammar) {
  return [
    [null,'Правило','Прочитай правило и два примера.',root=>{
      card(root,grammar.rule,'ru');
      grammar.items.slice(0,2).forEach(([prompt,right])=>card(root,prompt.replace('___',right)));
    }],
    ['choose','Выбери форму','Заполни пропуски.',root=>quiz(root,'choose',choices(grammarItems(grammar)))],
    ['type','Впиши ответ','Проверь себя без вариантов ответа.',root=>
      writing(root,'type',grammar.items.map(([prompt,right])=>[prompt,[right]]))]
  ];
}
let stopRecording;
function recordingPanel(root) {
  const panel=el('details','','sheet');
  panel.append(el('summary','🎙 Записать и прослушать себя'));
  const feedback=status();
  const playback=el('audio','','feature-audio');
  playback.controls=true;playback.hidden=true;
  let recorder, stream, recordingUrl, timer, preparing=false;
  const release=()=>{
    clearTimeout(timer);
    stream?.getTracks().forEach(track=>track.stop());stream=undefined;
  };
  const stop=btn('Остановить запись',()=>{if(recorder?.state==='recording')recorder.stop();});
  stop.disabled=true;
  const start=btn('Начать запись',async()=>{
    if(preparing||recorder?.state==='recording')return;
    if(!window.MediaRecorder||!navigator.mediaDevices?.getUserMedia){
      feedback.textContent='Запись недоступна в этом браузере. Можно напечатать ответ ниже.';return;
    }
    preparing=true;start.disabled=true;
    const currentPanel=current;
    try{
      const input=await navigator.mediaDevices.getUserMedia({audio:true});
      if(current!==currentPanel){input.getTracks().forEach(track=>track.stop());return;}
      stream=input;
      recorder=new MediaRecorder(stream);
      const chunks=[];
      recorder.addEventListener('dataavailable',event=>{if(event.data.size)chunks.push(event.data);});
      recorder.addEventListener('stop',()=>{
        release();stop.disabled=true;start.disabled=false;
        if(stopRecording===stopActive)stopRecording=undefined;
        if(!chunks.length){feedback.textContent='Запись пустая. Попробуй ещё раз.';return;}
        if(recordingUrl)URL.revokeObjectURL(recordingUrl);
        recordingUrl=URL.createObjectURL(new Blob(chunks,{type:recorder.mimeType}));
        playback.src=recordingUrl;playback.hidden=false;
        feedback.textContent='Запись готова. Прослушай себя. Понятны ли главная мысль и пример?';
      },{once:true});
      recorder.addEventListener('error',()=>{
        release();stop.disabled=true;start.disabled=false;
        feedback.textContent='Запись прервалась. Попробуй снова или напечатай ответ.';
      },{once:true});
      stopAudio();media?.pause();playback.pause();
      const stopActive=()=>{if(recorder?.state==='recording')recorder.stop();};
      stopRecording=stopActive;
      recorder.start();timer=setTimeout(stopActive,120000);
      stop.disabled=false;feedback.textContent='Идёт запись. Максимум две минуты.';
    }catch{release();feedback.textContent='Микрофон недоступен. Проверь разрешение браузера или напечатай ответ.';}
    finally{preparing=false;if(recorder?.state!=='recording')start.disabled=false;}
  },'primary');
  playback.addEventListener('play',()=>{stopAudio();media?.pause();recordingPlayback=playback;});
  window.addEventListener('pagehide',()=>{release();if(recordingUrl)URL.revokeObjectURL(recordingUrl);},{once:true});
  const actions=el('div','','actions');actions.append(start,stop);
  panel.append(actions,feedback,playback,
    el('p','Запись остаётся в этом браузере до закрытия страницы. Произношение можно проверить на слух.'));
  root.append(panel);
}
let recordingPlayback;
function responseStep(key,title,prompt,oral=false,options={}) {
  const min=options.min??(oral?16:25);
  const minSentences=options.sentences??2;
  const grammar=options.connectors??['because','so','for example','however','although','since'];
  const needsReason=!!options.connectors;
  return [key,title,oral
    ? 'Ответь вслух и прослушай себя. Для мгновенной проверки требований напечатай ответ ниже.'
    :'Напиши ответ. Проверка сразу покажет, какие требования выполнены.',root=>{
    card(root,prompt);
    if(oral)recordingPanel(root);
    const sheet=el('section','','sheet');
    const list=el('ul');
    list.append(el('li','Не меньше '+min+' слов по-английски.'),el('li','Не меньше '+minSentences+' предложений с точкой, вопросительным или восклицательным знаком.'));
    if(options.terms?.length)list.append(el('li','Используй хотя бы одно выражение: '+options.terms.join(', ')+'.'));
    if(needsReason)list.append(el('li','Используй хотя бы одно связующее выражение: '+grammar.join(', ')+'.'));
    const area=el('textarea');area.id=key+'-draft';area.lang='en';area.value=saved.responses?.[key]||'';
    const label=el('label','Твой ответ');label.htmlFor=area.id;
    const feedback=status();
    area.addEventListener('input',()=>{
      saved.responses={...saved.responses,[key]:area.value};done.delete(key);persist();paint();
      feedback.replaceChildren();
    });
    const check=btn('Проверить ответ',()=>{
      const value=area.value.trim();
      const words=value.match(/[A-Za-z]+(?:[’'-][A-Za-z]+)*/g)||[];
      const sentences=value.split(/[.!?]+/).filter(piece=>(piece.match(/[A-Za-z]+/g)||[]).length>=3).length;
      const punctuated=/[.!?]["”')]*$/.test(value);
      const phraseText=' '+value.toLowerCase().replace(/[^a-z]+/g,' ').trim()+' ';
      const hasPhrase=phrase=>phraseText.includes(' '+phrase.toLowerCase().replace(/[^a-z]+/g,' ').trim()+' ');
      const reason=grammar.some(hasPhrase);
      const checks=[
        [words.length>=min,'Объём: '+words.length+' из '+min+' слов.'],
        [sentences>=minSentences&&punctuated,'Предложения: '+sentences+' из '+minSentences+(punctuated?'.':'. Проверь знак в конце.')]
      ];
      if(options.terms?.length) {
        const matched=options.terms.filter(hasPhrase);
        checks.push([matched.length>0,matched.length?'Лексика по теме: '+matched.join(', ')+'.':'Добавь хотя бы одно выражение из списка.']);
      }
      if(needsReason)checks.push([reason,reason?'Связующее выражение есть.':'Добавь объяснение с '+grammar[0]+'.']);
      const result=el('ul');
      for(const [ok,message] of checks)result.append(el('li',(ok?'✓ ':'× ')+message));
      const passed=checks.every(([ok])=>ok);
      const guidance=el('p',passed?'Формальные требования выполнены. Сверь смысл с заданием и образцом.':'Исправь отмеченные пункты и проверь снова.');
      feedback.className='feedback '+(passed?'success':'error');
      feedback.replaceChildren(result,guidance);
      if(passed)finishStep(key);
    },'primary');
    sheet.append(list,label,area,check,feedback);
    root.append(sheet);
    if(options.model){
      const model=el('details','','sheet');model.append(el('summary','Сверить с примером ответа'));
      const example=el('p',options.model);example.lang='en';
      const modelFeedback=status();
      model.append(example,btn('🔊 Послушать пример',()=>speak(options.model,modelFeedback)),modelFeedback);
      root.append(model);
    }else{
      const model=el('details','','sheet');model.append(el('summary','Подсказка для самопроверки'));
      const example=el('p',oral
        ? 'My main point is … . For example, … . I think this matters because … .'
        : 'I would choose … because … . One example is … . This shows that … .');example.lang='en';
      model.append(example);root.append(model);
    }
  }];
}
function writeStep(prompt,options) {
  return responseStep('draft','Напиши свой текст',prompt,false,options);
}
function talkStep(prompt,options) {
  return responseStep('talk','Дай свой ответ',prompt,true,options);
}
const readingSkills = {
  gia2plus:[
    'Предскажи содержание по теме, затем проверь прогноз.',
    'Представь две иллюстрации к тексту. Отметь, какие детали они могли бы объяснить.',
    'Сначала прочитай вопросы. Найди в тексте строки, где есть ответы.',
    'Просмотри текст в поисках цен. Сравни итоговые суммы.',
    'Прочитай быстро и назови главную идею одним предложением.',
    'Ответь своими словами. Избегай дословного переписывания целых предложений.',
    'Угадай значение незнакомого слова по соседним предложениям.',
    'Определи жанр текста по цели, фактам и последовательности событий.'
  ],
  giab1:[
    'Просмотри текст быстро. Назови его главную идею одним предложением.',
    'Просмотри текст в поисках трёх способов учиться, затем перечитай нужные строки.',
    'Выбери незнакомое слово и предположи его значение по контексту.',
    'Подумай о цели текста: объяснить, рассказать историю или убедить?',
    'Представь фотографию по описанию. Объясни, что меняет подпись.',
    'Отметь проверяемый факт и личное мнение героя.',
    'Найди местоимения they и it. Определи, к чему они относятся.',
    'Раздели утверждение, проверку и исправление. Как читатель может проверить источник?'
  ]
};
function renderReading(root,reading,collapsible=false) {
  const panel=el(collapsible?'details':'article','','sheet reading-copy');
  panel.lang='en';
  if(collapsible){
    const label=el('summary','Открыть текст · '+reading.title);label.lang='ru';panel.append(label);
  }else{
    panel.append(el('h3',reading.title));
  }
  reading.paragraphs.forEach((paragraph,index)=>{
    const line=el('p');
    const number=el('span',String(index+1),'reading-paragraph-number');
    number.setAttribute('aria-hidden','true');
    line.append(number,' ');
    paragraph.split(/\*\*/).forEach((part,at)=>line.append(at%2?el('strong',part):part));
    panel.append(line);
  });
  root.append(panel);
}
function definitionsMatch(root,key,definitions) {
  const tile=el('section','','sheet');
  const doneRows=new Set();
  const count=status();
  count.textContent='Совпадений: 0 из '+definitions.length;
  tile.append(count);
  const words=definitions.map(([word])=>word).sort((a,b)=>a.localeCompare(b,'en'));
  const order=[...definitions.slice(2),...definitions.slice(0,2)];
  order.forEach(([word,definition],index)=>{
    const field=el('div','','definition-row');
    const select=el('select');
    select.id=key+'-definition-'+index;
    select.lang='en';
    const label=el('label',definition);
    label.lang='en';label.htmlFor=select.id;
    const feedback=status();feedback.id=select.id+'-feedback';
    select.setAttribute('aria-describedby',feedback.id);
    const placeholder=el('option','Выбери слово');placeholder.value='';select.append(placeholder);
    words.forEach(option=>{const choice=el('option',option);choice.value=option;select.append(choice);});
    select.addEventListener('change',()=>{
      if(!select.value){
        select.removeAttribute('aria-invalid');
        feedback.textContent='';
        return;
      }
      if(select.value!==word){
        select.setAttribute('aria-invalid','true');
        feedback.className='feedback error';
        feedback.textContent='Не подходит. Правильная пара: '+word+' — '+definition+'.';
        return;
      }
      select.removeAttribute('aria-invalid');
      select.disabled=true;
      feedback.className='feedback success';
      feedback.textContent='✓ '+word+' — '+definition+'.';
      doneRows.add(index);
      count.textContent='Совпадений: '+doneRows.size+' из '+definitions.length;
      if(doneRows.size===definitions.length)finishStep(key);
    });
    field.append(label,select,feedback);
    tile.append(field);
  });
  root.append(tile);
}
function readingTrueFalse(rows) {
  return rows.map(([result,statement,evidence])=>[
    statement,['True','False'],result==='T'?'True':'False',(result==='T'?'True. ':'False. ')+evidence
  ]);
}
function readingSteps(unit, number) {
  const article=unit.readingLesson;
  return [
    [null,'Перед чтением','Прочитай заголовок и предположи, о чём будет текст.',root=>{
      card(root,article.title);card(root,unit.topic,'ru');card(root,readingSkills[course.id][number-1],'ru');
    }],
    [null,'Чтение','Прочитай текст целиком. Обрати внимание на слова, выделенные жирным.',root=>renderReading(root,article)],
    ['understand','Главная мысль и детали','Ответь на вопросы по тексту.',root=>{
      renderReading(root,article,true);quiz(root,'understand',choices(unit.reading));
    }],
    ['trueFalse','True / False','Определи, какие утверждения верны по тексту. После ответа увидишь пояснение.',root=>{
      renderReading(root,article,true);quiz(root,'trueFalse',readingTrueFalse(article.trueFalse));
    }],
    ['gapFill','Gap filling','Впиши пропущенные слова по смыслу текста.',root=>{
      renderReading(root,article,true);writing(root,'gapFill',article.gaps);
    }],
    ['definitions','Match the definitions','Сопоставь определения на английском со словами, выделенными жирным в тексте.',root=>{
      renderReading(root,article,true);definitionsMatch(root,'definitions',article.definitions);
    }]
  ];
}
let media;
function audioPart(root,item,showTranscript=false) {
  const audio=el('audio','','feature-audio');audio.controls=true;audio.preload='none';
  audio.src='audio/extended-u'+item.number+'.mp3';
  audio.addEventListener('play',()=>{
    stopAudio();if(media!==audio)media?.pause();recordingPlayback?.pause();media=audio;
  });
  const feedback=status();
  audio.addEventListener('error',()=>{feedback.textContent='Аудио не загрузилось. Попробуй обновить страницу.';});
  root.append(audio,feedback);
  if(showTranscript){
    const transcript=el('details','','sheet');transcript.append(el('summary','Открыть текст для сверки'));
    for(const [speaker,line] of item.unit.extendedDialog){const p=el('p',speaker+': '+line);p.lang='en';transcript.append(p);}
    root.append(transcript);
  }
}
function listeningSteps(item) {
  const unit=item.unit;
  const [gist,...remaining]=unit.extendedListening;
  const details=remaining.slice(0,-1);
  const inference=remaining.at(-1);
  const steps=[
    ['gist','Первое прослушивание','Послушай целиком. Выбери основную мысль.',root=>{
      audioPart(root,item);quiz(root,'gist',choices([gist]));
    }],
    ['detail','Второе прослушивание','Переслушай и проверь детали: причины, время, условия и решения.',root=>{
      audioPart(root,item);quiz(root,'detail',choices(details));
    }],
    ['inference','Что можно понять из разговора?','Обрати внимание на смысл последних реплик.',root=>{
      audioPart(root,item);quiz(root,'inference',choices([inference]));
    }]
  ];
  if(unit.notes)steps.push(['notes','Заполни заметки','Запиши короткие ответы. Каждая строка проверяется сразу.',root=>{
    audioPart(root,item);writing(root,'notes',unit.notes);
  }]);
  steps.push(['transcript','Сверься с текстом','Проверь, какие выражения помогли тебе понять диалог.',root=>{
    audioPart(root,item,true);
    quiz(root,'transcript',choices([details.at(-1)]));
  }]);
  const prototype=course.id==='giab1'&&item.number===4;
  steps.push(talkStep(prototype?'Explain whether you would approve the trial. Give one reason and suggest one fair test.':unit.speaking,
    prototype?{connectors:['because','so','however'],terms:['trial','prototype','design','route'],model:'I would approve a supervised trial because the last test was too short. I would ask six cyclists to try both designs on the same route.'}:undefined));
  return steps;
}
function buildSteps(item) {
  const unit=item.unit;
  switch(item.kind){
    case 'starter': return [...wordSteps(item.words),...grammarSteps(item.grammar),writeStep(item.writing)];
    case 'vocab': return [...vocabularySteps(unit,'vocab'),talkStep('Choose three of the new expressions and use them to describe a real or imaginary situation.')];
    case 'vocab2': return [...vocabularySteps(unit,'vocab2'),talkStep(unit.speaking)];
    case 'reading': return readingSteps(unit,item.number);
    case 'grammar1': return [...grammarSteps(unit.grammar[0]),talkStep('Make two true sentences using today’s grammar, then ask a partner a question.')];
    case 'grammar2': return [...grammarSteps(unit.grammar[1]),talkStep(unit.speaking)];
    case 'listening': return listeningSteps(item);
    case 'writing': return [
      [null,'Составь план','Подумай, с чего начнёшь, какие детали добавишь и чем закончишь.',root=>card(root,unit.writing)],
      writeStep(unit.writing,{min:course.label==='B1'?45:30,sentences:3,connectors:['because','so','for example','however'],terms:unit.words.slice(0,6).map(([word])=>word)}),
      responseStep('revision','Проверь и уточни','Choose one sentence from your text. Rewrite it with a clearer reason or example.',false,
        {min:12,sentences:1,connectors:['because','for example','so']}),
      talkStep('Summarise your text for a listener. Explain your choice and give one example.',{connectors:['because','for example','so']})
    ];
    case 'test': return [
      ['lexis','Лексика','Выбери правильные выражения.',root=>quiz(root,'lexis',choices(wordItems(unit.words).filter((_,i)=>i%2===0)))],
      ['forms','Грамматика','Впиши подходящую форму.',root=>writing(root,'forms',unit.grammar.flatMap(grammar=>grammar.items.slice(0,3).map(([prompt,right])=>[prompt,[right]])))],
      ['readtest','Чтение','Прочитай текст и ответь на вопросы.',root=>{renderReading(root,unit.readingLesson);quiz(root,'readtest',readingTrueFalse(unit.readingLesson.trueFalse));}],
      ['listentest','Аудирование','Послушай диалог и проверь понимание.',root=>{audioPart(root,item);quiz(root,'listentest',choices(unit.extendedListening.slice(2)));}]
    ];
    case 'review': return [
      ['reviewWords','Лексика двух юнитов','Вспомни значения.',root=>quiz(root,'reviewWords',choices(item.units.flatMap(unit=>wordItems(reviewVocabulary(unit))).filter((_,i)=>i%2===0)))],
      ['reviewRule','Грамматика двух юнитов','Выбери форму.',root=>quiz(root,'reviewRule',choices(item.units.flatMap(unit=>unit.grammar.flatMap(grammar=>grammarItems(grammar).slice(0,2)))))],
      ...item.units.map((unit,i)=>['reviewRead'+i,'Чтение · '+unit.title,'Найди подтверждение в тексте.',root=>{renderReading(root,unit.readingLesson);quiz(root,'reviewRead'+i,choices(unit.reading));}]),
      talkStep('Choose one topic from these units. Give an example from your own experience and explain your opinion.')
    ];
    default: return [];
  }
}

function paint(){
  dotButtons.forEach((dot,index)=>{
    dot.setAttribute('aria-current',index===current?'step':'false');
    dot.classList.toggle('complete',done.has(panels[index]?.dataset.key));
  });
  if(summary)summary.textContent='Задания с проверкой: '+done.size+' из '+assessedSteps;
  if(completion)completion.textContent=done.size===assessedSteps
    ? '✓ Все задания с проверкой выполнены.'
    : 'Вернись к любому шагу без отметки и закончи задание. Результат обновится автоматически.';
}
function show(index,focus=true){
  if(index<0||index>=panels.length)return;
  stopAudio();media?.pause();recordingPlayback?.pause();stopRecording?.();
  current=index;
  panels.forEach((panel,at)=>{panel.hidden=at!==index;});
  stage.scrollTop=0;
  position.textContent=index>0&&index<panels.length-1?index+' / '+(panels.length-2):'';
  previous.style.visibility=index===0?'hidden':'';
  next.style.visibility=index===panels.length-1?'hidden':'';
  if(focus){const heading=panels[index].querySelector('h1,h2');heading.tabIndex=-1;heading.focus({preventScroll:true});}
  paint();
}
function renderLesson(item){
  const vocabularyChanged=item.unit?.vocabularyGroups&&['vocab','vocab2','test'].includes(item.kind) ||
    item.units?.some(unit=>unit.vocabularyGroups);
  storageKey=course.id+(vocabularyChanged?':vocabulary-v4:':item.kind==='reading'?':reading-v3:':':home-v2:')+item.id;
  try {saved=JSON.parse(localStorage.getItem(storageKey))||{};}catch{}
  done=new Set(saved.done||[]);
  const steps=buildSteps(item);
  assessedSteps=steps.filter(([key])=>key).length;
  const heading=item.unit?item.unit.title+' · '+item.title:item.title;
  document.title=heading+' · '+title;
  const cover=el('section','','slide cover');
  const owl=el('img','','owl');owl.src='../../assets/oksi_cheer.png';owl.alt='';
  const plan=el('div','','plan');
  steps.forEach(([,name],index)=>plan.append(btn(name,()=>show(index+1))));
  const copyStatus=status();
  cover.append(owl,el('h1',heading),el('p',title+' · Урок дома','lead'),
    el('p',item.source),plan,btn('Начать →',()=>show(1),'primary'),copyButton(href(item),copyStatus),copyStatus);
  panels=[cover,...steps.map(([key,name,hint,render],index)=>{
    const panel=el('section','','slide');if(key)panel.dataset.key=key;
    const h2=el('h2');h2.append(el('span',String(index+1),'number'),name);
    panel.append(h2,el('p',hint));render(panel);return panel;
  })];
  const end=el('section','','slide cover');summary=status();completion=status();
  end.append(el('h2','Результат урока'),summary,completion,link('← К списку уроков','./#'+groups.find(g=>g.lessons.includes(item)).id));
  panels.push(end);
  dotButtons=panels.map((_,index)=>{
    const dot=btn('',()=>show(index));
    dot.setAttribute('aria-label',index===0?'Обложка':index===panels.length-1?'Результат':steps[index-1][1]);
    dots.append(dot);return dot;
  });
  stage.append(...panels);
  document.querySelector('.navigation').hidden=false;
  previous.addEventListener('click',()=>show(current-1));next.addEventListener('click',()=>show(current+1));
  show(0,false);
}
if(entry?.kind==='external')location.replace(href(entry));
else if(entry)renderLesson(entry);
else showCatalog();
