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
    title:kind==='grammar1'?unit.grammar[0].title:kind==='grammar2'?unit.grammar[1].title:label,
    source:'Student’s Book · Unit '+number+' · с. '+unit.page+'–'+(unit.page+11)
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
function mark(root,key,label='Сделано') {
  root.append(btn(label,()=>finishStep(key),'primary'));
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
function wordSteps(words) {
  return [
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
}
function grammarSteps(grammar) {
  return [
    ['rule','Правило','Прочитай правило и два примера.',root=>{
      card(root,grammar.rule,'ru');
      grammar.items.slice(0,2).forEach(([prompt,right])=>card(root,prompt.replace('___',right)));
      mark(root,'rule','Правило прочитано');
    }],
    ['choose','Выбери форму','Заполни пропуски.',root=>quiz(root,'choose',choices(grammarItems(grammar)))],
    ['type','Впиши ответ','Проверь себя без вариантов ответа.',root=>
      writing(root,'type',grammar.items.map(([prompt,right])=>[prompt,[right]]))]
  ];
}
function writeStep(prompt) {
  return ['draft','Напиши свой текст','Текст сохраняется в этом браузере.',root=>{
    const sheet=card(root,prompt);
    const area=el('textarea');area.id='writing-draft';area.lang='en';area.value=saved.profile||'';
    const label=el('label','Твой текст');label.htmlFor=area.id;
    const feedback=status();
    area.addEventListener('input',()=>{saved.profile=area.value;persist();});
    sheet.append(label,area,btn('Проверить по памятке',()=>{
      const count=area.value.trim().split(/\s+/).filter(Boolean).length;
      if(count<20){feedback.textContent='Добавь детали и поясни свою мысль.';return;}
      feedback.textContent='Проверь, что ты выполнил все пункты задания, связал идеи и перечитал текст вслух.';
      finishStep('draft');
    },'primary'),feedback);
  }];
}
function talkStep(prompt) {
  return ['talk','Скажи вслух','Подготовь ответ. Если есть собеседник, поменяйтесь ролями.',root=>{
    card(root,prompt);
    mark(root,'talk','Я выполнил устное задание');
  }];
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
function readingSteps(unit, number) {
  return [
    ['predict','Перед чтением','Прочитай подсказку к этому тексту.',root=>{
      card(root,unit.title);card(root,unit.topic,'ru');card(root,readingSkills[course.id][number-1],'ru');mark(root,'predict','Я готов читать');
    }],
    ['text','Чтение','Прочитай авторский текст. Примени приём из предыдущего шага.',root=>{
      card(root,unit.text);mark(root,'text','Текст прочитан');
    }],
    ['understand','Понимание текста','Ответь на вопросы. Найди подтверждение в тексте.',root=>{
      card(root,unit.text);quiz(root,'understand',choices(unit.reading));
    }],
    talkStep('Summarise the text in three sentences. Explain which detail was most important and why.')
  ];
}
let media;
function audioPart(root,item) {
  const audio=el('audio','','feature-audio');audio.controls=true;audio.preload='none';
  audio.src='audio/u'+item.number+'.mp3';media=audio;
  const transcript=el('details','','sheet');transcript.append(el('summary','Показать текст диалога'));
  for(const [speaker,line] of item.unit.dialog){const p=el('p',speaker+': '+line);p.lang='en';transcript.append(p);}
  root.append(audio,transcript);
}
function buildSteps(item) {
  const unit=item.unit;
  switch(item.kind){
    case 'starter': return [...wordSteps(item.words),...grammarSteps(item.grammar),writeStep(item.writing)];
    case 'vocab': return [...wordSteps(unit.words.slice(0,6)),talkStep('Choose three of the new expressions and use them to describe a real or imaginary situation.')];
    case 'vocab2': return [...wordSteps(unit.words.slice(6)),talkStep(unit.speaking)];
    case 'reading': return readingSteps(unit,item.number);
    case 'grammar1': return [...grammarSteps(unit.grammar[0]),talkStep('Make two true sentences using today’s grammar, then ask a partner a question.')];
    case 'grammar2': return [...grammarSteps(unit.grammar[1]),talkStep(unit.speaking)];
    case 'listening': return [
      ['audio','Послушай диалог','Первый раз послушай без текста. Во второй раз проверь детали.',root=>{audioPart(root,item);mark(root,'audio','Диалог прослушан');}],
      ['understand','Проверь понимание','Выбери ответы на вопросы по записи.',root=>quiz(root,'understand',choices(unit.listening))],
      talkStep(unit.speaking),
      ['roleplay','Поменяйтесь ролями','Инсценируйте разговор. Измените одну деталь и задайте уточняющий вопрос.',root=>mark(root,'roleplay','Диалог готов')]
    ];
    case 'writing': return [
      ['plan','Составь план','Запиши план на бумаге: начало, две детали и итог.',root=>{card(root,unit.writing);mark(root,'plan','План готов');}],
      writeStep(unit.writing),
      talkStep('Read your text aloud. Change one detail to make it clearer for a listener.'),
      ['project','Мини-проект','Представь текст как карточку, одно слайдовое сообщение или заметку.',root=>mark(root,'project','Проект готов')]
    ];
    case 'test': return [
      ['lexis','Лексика','Выбери правильные выражения.',root=>quiz(root,'lexis',choices(wordItems(unit.words).filter((_,i)=>i%2===0)))],
      ['forms','Грамматика','Впиши подходящую форму.',root=>writing(root,'forms',unit.grammar.flatMap(grammar=>grammar.items.slice(0,3).map(([prompt,right])=>[prompt,[right]])))],
      ['readtest','Чтение','Прочитай текст и ответь на вопросы.',root=>{card(root,unit.text);quiz(root,'readtest',choices(unit.reading));}],
      ['listentest','Аудирование','Послушай диалог и проверь понимание.',root=>{audioPart(root,item);quiz(root,'listentest',choices(unit.listening));}]
    ];
    case 'review': return [
      ['reviewWords','Лексика двух юнитов','Вспомни значения.',root=>quiz(root,'reviewWords',choices(item.units.flatMap(unit=>wordItems(unit.words.slice(0,6))).filter((_,i)=>i%2===0)))],
      ['reviewRule','Грамматика двух юнитов','Выбери форму.',root=>quiz(root,'reviewRule',choices(item.units.flatMap(unit=>unit.grammar.flatMap(grammar=>grammarItems(grammar).slice(0,2)))))],
      ...item.units.map((unit,i)=>['reviewRead'+i,'Чтение · '+unit.title,'Найди подтверждение в тексте.',root=>{card(root,unit.text);quiz(root,'reviewRead'+i,choices(unit.reading));}]),
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
  if(summary)summary.textContent='Выполнено: '+done.size+' из '+(panels.length-2);
}
function show(index,focus=true){
  if(index<0||index>=panels.length)return;
  stopAudio();media?.pause();
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
  storageKey=course.id+':home-v1:'+item.id;
  try {saved=JSON.parse(localStorage.getItem(storageKey))||{};}catch{}
  done=new Set(saved.done||[]);
  const steps=buildSteps(item);
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
    const panel=el('section','','slide');panel.dataset.key=key;
    const h2=el('h2');h2.append(el('span',String(index+1),'number'),name);
    panel.append(h2,el('p',hint));render(panel);return panel;
  })];
  const end=el('section','','slide cover');summary=status();const result=status();
  if(saved.finished)result.textContent='Урок уже отмечен на этом устройстве.';
  end.append(el('h2','Урок пройден?'),summary,btn('🎉 Я сделал!',()=>{
    if(done.size<steps.length){result.textContent='Заверши все шаги, чтобы отметить урок.';return;}
    saved.finished=true;persist();result.textContent='Урок отмечен на этом устройстве.';
  },'primary'),result,link('← К списку уроков','./#'+groups.find(g=>g.lessons.includes(item)).id));
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
