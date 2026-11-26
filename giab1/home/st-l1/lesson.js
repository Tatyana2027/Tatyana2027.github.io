const storageKey = 'giab1:starter:my-favourite-things';
const stage = document.querySelector('#stage');
const dots = document.querySelector('#steps');
const next = document.querySelector('#next');
const previous = document.querySelector('#previous');
const position = document.querySelector('#position');
let saved = {};
try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch {}
const done = new Set(saved.done || []);
let current = 0;
let panels = [];

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
const profiles = [
  ['Maya', 'I used to fill every Saturday with plans. Now I prefer taking photos outdoors. Last month my friend asked me to go mountain biking. I was nervous about the hills, but we chose an easy route. I would rather ride with a friend than go alone.'],
  ['Theo', 'I am keen on live music, so I often go to concerts. But when the weather is bad, I would rather stay at home and play the guitar. I enjoy practising with my sister because she helps me notice my mistakes. We are hoping to perform at a school event.']
];
const vocabulary = [
  ['go mountain biking','кататься на горном велосипеде'], ['go to a concert','ходить на концерт'],
  ['listen to live music','слушать живую музыку'], ['play the guitar','играть на гитаре'],
  ['do yoga','заниматься йогой'], ['watch a horror film','смотреть фильм ужасов'],
  ['be keen on','увлекаться'], ['would rather','предпочёл бы']
];

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

const listenText = 'This Friday our youth club has two activities. You can try yoga in the sports hall or play in a short music session. I am keen on music, but my friend wants to try yoga, so we are going to the sports hall together. The music session starts at seven. Yoga starts half an hour earlier.';
const lesson = [
  ['profiles','Two ways to spend a weekend','Прочитай два авторских профиля и послушай героев.', root => {
    const cards = el('div','','grid');
    for (const [name,text] of profiles) {
      const card=el('article','','sheet');
      const paragraph=el('p',text);paragraph.lang='en';
      const feedback=status();
      card.append(el('strong',name),paragraph,btn('🔊 Послушать '+name,()=>playTrack(name,feedback)),feedback);
      cards.append(card);
    }
    root.append(cards,btn('Профили прочитаны',()=>finishStep('profiles'),'primary'));
  }],
  ['reading','Чтение с доказательством','Выбери ответ, затем найди строку, которая его подтверждает.', root => quiz(root,'reading',[
    ['Why did Maya and her friend choose an easy route?',['Maya was nervous about the hills.','They were late.','It was raining.'],'Maya was nervous about the hills.','Обрати внимание на nervous about the hills.'],
    ['Why does Theo practise with his sister?',['She plays at concerts.','She helps him notice his mistakes.','They live next to the sports hall.'],'She helps him notice his mistakes.','Найди причину после because.'],
    ['What do both profiles mention?',['Activities to do with another person','A dislike of music','A preference for being alone'],'Activities to do with another person','Майя ездит с другом, Тео занимается с сестрой.']
  ])],
  ['words','Лексика','Послушай устойчивые выражения и повтори.',root=>{
    const grid=el('div','','grid');const heard=new Set();
    vocabulary.forEach(([word,translation],index)=>{
      const card=el('article','','sheet'),feedback=status();
      card.append(btn('🔊 '+word,()=>{speak(word,feedback);heard.add(index);if(heard.size===vocabulary.length)finishStep('words');}),
        el('p',translation),feedback);grid.append(card);
    });root.append(grid);
  }],
  ['phrases','Do, go or play?','Выбери глагол в каждом сочетании.', root=>quiz(root,'phrases',[
    ['___ yoga',['do','go','play'],'do','Do yoga.'],
    ['___ mountain biking',['play','do','go'],'go','Go mountain biking.'],
    ['___ the guitar',['go','play','do'],'play','Play the guitar.'],
    ['___ to a concert',['watch','go','do'],'go','Go to a concert.']
  ])],
  ['preferences','Как выразить предпочтение','Выбери форму, которая подходит после выделенного выражения.',root=>quiz(root,'preferences',[
    ['I’m keen on ___ photos.',['take','taking','to take'],'taking','После keen on нужен глагол с -ing.'],
    ['I’d rather ___ at home.',['stay','staying','to stay'],'stay','После would rather — глагол без to.'],
    ['I enjoy ___ live music.',['listen to','to listen to','listening to'],'listening to','После enjoy нужен глагол с -ing.']
  ])],
  ['writing','Впиши форму','Впиши пропущенное слово или выражение.',root=>writing(root,'writing',[
    ['We’re keen ___ live music.',['on']],
    ['I’d rather ___ a concert than watch TV.',['go to']],
    ['She enjoys ___ (play) the guitar.',['playing']],
    ['They often ___ yoga on Fridays.',['do']]
  ])],
  ['listening','Listen and choose','Послушай объявление и выбери ответы.',root=>{
    const feedback=status();const details=el('details','','sheet');const text=el('p',listenText);text.lang='en';
    details.append(el('summary','Показать текст аудио'),text);
    root.append(btn('▶ Слушать',()=>playTrack('club',feedback),'primary'),feedback,details);
    quiz(root,'listening',[
      ['Which activity are the friends choosing?',['Yoga','A concert','Mountain biking'],'Yoga','The friend wants to try yoga.'],
      ['What time does yoga start?',['6:00','6:30','7:00'],'6:30','Half an hour before seven.']
    ]);
  }],
  ['reason','Выбери и объясни','Отличи предпочтение от его причины.',root=>quiz(root,'reason',[
    ['Which part gives a reason? “I’d rather go with a friend because I don’t know the route.”',
      ['I’d rather go with a friend','because I don’t know the route'],'because I don’t know the route','Because вводит причину.'],
    ['Which sentence gives a preference and a reason?',
      ['I like music and I like sport.','I’d rather play the guitar because it helps me relax.'],'I’d rather play the guitar because it helps me relax.','Есть выбор и объяснение с because.']
  ])],
  ['speaking','Мини-интервью','Ответь вслух, затем поменяй роли с собеседником.',root=>{
    const card=el('article','','sheet');
    for(const question of ['What are you keen on?','Would you rather go to a concert or stay at home? Why?','Is there an activity you’d like to try?'])card.append(el('p',question));
    root.append(card,btn('Я ответил на три вопроса',()=>finishStep('speaking'),'primary'));
  }],
  ['profile','My ideal Saturday','Напиши 4–5 предложений. Сравни два занятия и объясни свой выбор.',root=>{
    const card=el('section','','sheet');const area=el('textarea');area.id='saturday';area.value=saved.profile||'';
    const label=el('label','Твой текст');label.htmlFor=area.id;const feedback=status();
    area.addEventListener('input',()=>{saved.profile=area.value;persist();});
    card.append(label,area,btn('Проверить по памятке',()=>{
      if(area.value.trim().split(/\s+/).length<20){feedback.textContent='Добавь два занятия и причину своего выбора.';return;}
      feedback.textContent='Проверь сочетания do / go / play, форму после would rather и причину после because.';
      finishStep('profile');
    },'primary'),feedback);root.append(card);
  }],
  ['book','С учебником и тетрадью','Student’s Book, стр. 6–7, и авторская практика.',root=>{
    const items=['Повтори сочетания с глаголами на стр. 6.','Посмотри задания о предпочтениях на стр. 7.','Запиши два предпочтения и объясни каждое через because.'];
    const checks=new Set(saved.book||[]);
    items.forEach((text,index)=>{
      const row=el('label','','sheet');row.style.display='block';
      const check=el('input');check.type='checkbox';check.checked=checks.has(index);
      check.addEventListener('change',()=>{
        if(check.checked)checks.add(index);else checks.delete(index);
        saved.book=[...checks];if(checks.size===items.length)done.add('book');else done.delete('book');persist();paint();
      });row.append(check,text);root.append(row);
    });
  }]
];

const copyStatus=status();
const copy=btn('🔗 Скопировать ссылку',async()=>{
  const address=location.href;
  try{await navigator.clipboard.writeText(address);copyStatus.textContent='Ссылка скопирована.';}
  catch{copyStatus.textContent=address;}
});
const cover=el('section','','slide cover');
const mascot=el('img','','owl');
mascot.src='https://tatyana2027.github.io/assets/oksi_cheer.png';
mascot.alt='';
const startPlan=el('div','','plan');
lesson.forEach(([,title],index)=>startPlan.append(btn(title,()=>show(index+1))));
cover.append(mascot,el('h1','My favourite things'),el('p','Get Involved! B1 · Starter · Lesson 1','lead'),
  el('p','Student’s Book · стр. 6–7 · 15–20 минут'),startPlan,btn('Начать →',()=>show(1),'primary'),copy,copyStatus);
panels=[cover,...lesson.map(([key,title,hint,render],index)=>{
  const section=el('section','','slide');
  const heading=el('h2');
  heading.append(el('span',String(index+1),'number'),title);
  section.append(heading,el('p',hint));
  render(section);
  return section;
})];
const end=el('section','','slide cover');
const summary=status();
const completion=status();
end.append(el('h2','Занятие пройдено?'),summary,btn('🎉 Я сделал!',()=>{
  if(done.size<6){completion.textContent='Выполни хотя бы 6 шагов.';return;}
  saved.finished=true;persist();completion.textContent='Урок отмечен на этом устройстве.';
},'primary'),completion);
if(saved.finished)completion.textContent='Урок уже отмечен на этом устройстве.';
panels.push(end);
const dotButtons=panels.map((_,index)=>{
  const control=btn('',()=>show(index));control.setAttribute('aria-label',
    index===0?'Обложка':index===panels.length-1?'Результат':lesson[index-1][1]);
  dots.append(control);return control;
});
stage.append(...panels);
function paint(){
  dotButtons.forEach((dot,index)=>{
    dot.setAttribute('aria-current',index===current?'step':'false');
    dot.classList.toggle('complete',done.has(lesson[index-1]?.[0]));
  });
  summary.textContent='Выполнено: '+done.size+' из '+lesson.length;
}
function show(index,focus=true){
  if(index<0 || index>=panels.length)return;
  stopAudio();
  current=index;
  panels.forEach((panel,at)=>{panel.hidden=at!==index;});
  stage.scrollTop=0;
  position.textContent=index>0 && index<=lesson.length?index+' / '+lesson.length:'';
  previous.style.visibility=index===0?'hidden':'';
  next.style.visibility=index===panels.length-1?'hidden':'';
  if(focus){
    const heading=panels[index].querySelector('h1,h2');
    heading.tabIndex=-1;heading.focus({preventScroll:true});
  }
  paint();
}
previous.addEventListener('click',()=>show(current-1));
next.addEventListener('click',()=>show(current+1));
show(0,false);
