(() => {
'use strict';
const episodes = Array.from({length:11}, (_, i) => ({
  number:i+1,
  title:`قسمت ${i+1}`,
  paragraphs:[],
  image:null
}));
window.Emergence2Catalog = Object.freeze({title:'فصل دوم ظهور', total:11, episodes});
})();