(() => {
'use strict';
const episodes = Array.from({length:11}, (_, i) => ({
  number:i+1,
  title:`قسمت ${i+1}`,
  paragraphs:[],
  image:null
}));
episodes[0].image='content/emergence1.jpg';
episodes[1].image='content/emergence2.jpg';
window.Emergence2Catalog = Object.freeze({title:'فصل دوم ظهور', total:11, episodes});
})();