'use strict';
const names=['The project','01 / Customer measurements','02 / Pattern for making','03 / Construction & fit review','04 / Optional visualization','Credits'];
const menu=document.querySelector('#chapter-menu'),button=document.querySelector('#menu-toggle');
document.querySelectorAll('main > section').forEach((section,i)=>{const link=document.createElement('a');link.href='#'+section.id;link.textContent=names[i];menu.append(link);});
function closeMenu(){menu.hidden=true;button.setAttribute('aria-expanded','false');}
button.addEventListener('click',()=>{menu.hidden=!menu.hidden;button.setAttribute('aria-expanded',String(!menu.hidden));});
menu.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){closeMenu();button.focus();}});
