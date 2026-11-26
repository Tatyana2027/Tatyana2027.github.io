const storageKey = 'gia2plus:starter:meet-two-students';
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
  ['Nina','Hi, I’m Nina. I’m fourteen and I live in Glasgow with my mum and my younger brother. I’ve got a cat called Olive. I love taking photos and I enjoy making short videos. I don’t like watching horror films. My favourite place is the library, where I meet my friend Bea.'],
  ['Leo','I’m Leo. I’m fifteen and I live in Bristol. I’ve got two sisters, and we often cook together. I’m from Spain, so I speak Spanish at home. I love playing basketball, but I don’t like getting up early. My favourite food is noodles.']
];
const vocabulary = [
  ['take photos','фотографировать'],['make short videos','снимать короткие видео'],
  ['watch horror films','смотреть фильмы ужасов'],['meet friends','встречаться с друзьями'],
  ['play basketball','играть в баскетбол'],['get up early','рано вставать'],
  ['speak a language','говорить на языке'],['live with my family','жить с семьёй']
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

const lesson = [
  ['profiles','Meet two students','Прочитай два профиля. Нажми «Послушать», чтобы услышать каждого героя.', root => {
    const cards = el('div','','grid');
    for (const [name,text] of profiles) {
      const card = el('article','','sheet');
      const paragraph = el('p',text);
      paragraph.lang = 'en';
      const feedback = status();
      card.append(el('strong',name),paragraph,btn('🔊 Послушать',()=>playTrack(name,feedback)),feedback);
      cards.append(card);
    }
    root.append(cards,btn('Профили прочитаны',()=>finishStep('profiles'),'primary'));
  }],
  ['reading','Проверь чтение','Найди подтверждение в профиле.', root => quiz(root,'reading',[
    ['Кто говорит по-испански дома?',['Nina','Leo'],'Leo','Leo speaks Spanish at home.'],
    ['Куда Нина ходит встречаться с подругой?',['The library','The sports centre','The cinema'],'The library','Nina meets Bea at the library.'],
    ['Кто часто готовит вместе с сёстрами?',['Nina','Leo'],'Leo','Leo and his sisters often cook together.'],
    ['Какого занятия Нина избегает?',['Taking photos','Making videos','Watching horror films'],'Watching horror films','Nina doesn’t like watching horror films.']
  ])],
  ['words','Слова и выражения','Нажимай на карточки, чтобы услышать фразы.', root => {
    const grid = el('div','','grid');
    const heard = new Set();
    vocabulary.forEach(([word,translation],index) => {
      const card = el('article','','sheet');
      const feedback = status();
      card.append(btn('🔊 '+word,()=>{speak(word,feedback);heard.add(index);if(heard.size===vocabulary.length)finishStep('words');}),
        el('p',translation),feedback);
      grid.append(card);
    });
    root.append(grid);
  }],
  ['phrases','Собери выражения','Выбери глагол, который подходит по смыслу.', root => quiz(root,'phrases',[
    ['___ photos',['make','play','take'],'take','Take photos — фотографировать.'],
    ['___ short videos',['make','speak','meet'],'make','Make short videos — снимать видео.'],
    ['___ friends after school',['watch','meet','take'],'meet','Meet friends — встречаться с друзьями.'],
    ['___ up early',['get','live','come'],'get','Get up — вставать.']
  ])],
  ['possessive','My, your, his, her','Выбери слово, которое показывает, кому что принадлежит.', root => quiz(root,'possessive',[
    ['I’ve got a cat. ___ cat is called Olive.',['My','Her','Their'],'My','I → my.'],
    ['Leo has two sisters. ___ sisters like cooking.',['Our','His','Her'],'His','He → his.'],
    ['Nina meets ___ friend at the library.',['his','their','her'],'her','She → her.'],
    ['We live in Bristol. ___ home is near a park.',['Our','Your','Its'],'Our','We → our.']
  ])],
  ['have','Have got / has got','Впиши недостающие слова. Можно использовать полную или краткую форму.', root => writing(root,'have',[
    ['Nina ___ a younger brother.',['has got',"'s got"]],
    ['Leo and Nina ___ different hobbies.',['have got',"'ve got"]],
    ['I ___ a sister. (отрицание)',['haven’t got','have not got']],
    ['He ___ a pet. (отрицание)',['hasn’t got','has not got']]
  ])],
  ['likes','Likes and dislikes','После enjoy, а в этих примерах также после love и don’t like, используй форму на -ing.', root => quiz(root,'likes',[
    ['I enjoy ___ photos.',['taking','take','took'],'taking','После enjoy нужна форма на -ing.'],
    ['Nina loves ___ short videos.',['make','making','makes'],'making','В этой модели: loves making.'],
    ['Leo doesn’t like ___ up early.',['get','getting','gets'],'getting','В этой модели: doesn’t like getting.']
  ])],
  ['listening','Listen and write','Послушай новый профиль. Затем заполни пропуски.', root => {
    const feedback = status();
    const text = 'Hi, I’m Oli. I live in York with my dad. I’ve got one sister. I love drawing and I don’t like cooking.';
    const details = el('details','','sheet');
    const transcript=el('p',text);
    transcript.lang='en';
    details.append(el('summary','Показать текст аудио'),transcript);
    root.append(btn('▶ Слушать',()=>playTrack('Oli',feedback),'primary'),feedback,details);
    writing(root,'listening',[
      ['Where does Oli live? (город)',['York']],
      ['How many sisters has Oli got?',['one','1','one sister']],
      ['What does Oli love doing?',['drawing']]
    ]);
  }],
  ['questions','Ask a classmate','Составь вопросы по подсказкам.', root => writing(root,'questions',[
    ['where / you / live',['Where do you live']],
    ['what / you / enjoy / doing',['What do you enjoy doing']],
    ['you / have got / a pet',['Have you got a pet','Do you have a pet']]
  ])],
  ['profile','My profile','Напиши четыре предложения. Можно придумать персонажа.', root => {
    const card=el('section','','sheet');
    const textarea=el('textarea');
    textarea.id='profile-draft';
    textarea.rows=5;
    textarea.value=saved.profile || '';
    textarea.placeholder='I’m … I live in … I’ve got … I enjoy …';
    textarea.addEventListener('input',()=>{saved.profile=textarea.value;persist();});
    const label=el('label','Твой текст');label.htmlFor=textarea.id;
    const feedback=status();
    card.append(label,textarea,btn('Проверить по памятке',()=>{
      if(textarea.value.trim().split(/\s+/).filter(Boolean).length<12){
        feedback.textContent='Добавь детали: имя, место, семью или питомца и любимое занятие.';
        return;
      }
      feedback.textContent='Прочитай текст вслух: проверь заглавную I, точки и форму на -ing после enjoy.';
      finishStep('profile');
    },'primary'),feedback);
    root.append(card);
  }],
  ['book','С учебником и тетрадью','Отметь, что выполнил.',root=>{
    const items = [
      ['Student’s Book · стр. 6','Прочитай два профиля в книге и ответь на вопросы к ним.'],
      ['Student’s Book · стр. 7','Повтори притяжательные слова, have got и фразы о том, что нравится.'],
      ['Практика в тетради','Запиши два утверждения о себе с have got и два предложения о любимых занятиях.']
    ];
    const checks=new Set(saved.book || []);
    items.forEach(([title,text],index)=>{
      const item=el('label','','sheet');
      item.style.display='block';
      const check=el('input');check.type='checkbox';check.checked=checks.has(index);
      check.addEventListener('change',()=>{
        if(check.checked) checks.add(index); else checks.delete(index);
        saved.book=[...checks];
        if(checks.size===items.length) done.add('book'); else done.delete('book');
        persist();paint();
      });
      item.append(el('strong',title),el('p',text),check,'Сделано');
      root.append(item);
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
cover.append(mascot,el('h1','Meet two students'),el('p','Get Involved! A2+ · Starter · Lesson 1','lead'),
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
