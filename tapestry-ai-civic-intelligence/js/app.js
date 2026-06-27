// Tapestry AI — shared interactions
(function(){
  document.documentElement.classList.add('js');
  // loader
  function hideLoader(){var l=document.getElementById('loader');if(l)setTimeout(()=>l.classList.add('done'),450);}
  if(document.readyState==='complete')hideLoader();else window.addEventListener('load',hideLoader);

  document.addEventListener('DOMContentLoaded',function(){
    // mobile nav
    var t=document.querySelector('.nav-toggle');
    if(t)t.addEventListener('click',()=>document.querySelector('.nav-links').classList.toggle('open'));

    // active link by path
    var path=location.pathname.replace(/\/$/,'')||'/';
    document.querySelectorAll('.nav-links a').forEach(a=>{
      var href=a.getAttribute('href').replace(/\/$/,'')||'/';
      if(href===path)a.classList.add('active');
    });

    // reveal on scroll
    var io=new IntersectionObserver((es)=>{
      es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
    },{threshold:.12});
    document.querySelectorAll('.reveal').forEach((el,i)=>{
      el.style.transitionDelay=(Math.min(i%6,6)*0.07)+'s';
      io.observe(el);
    });

    // count up
    var co=new IntersectionObserver((es)=>{
      es.forEach(e=>{
        if(!e.isIntersecting)return;
        var el=e.target,to=parseFloat(el.dataset.count),dec=(el.dataset.dec|0),
            suf=el.dataset.suffix||'',pre=el.dataset.prefix||'',st=null,dur=1500;
        function step(ts){if(!st)st=ts;var p=Math.min((ts-st)/dur,1);
          var v=(to*(1-Math.pow(1-p,3)));
          el.textContent=pre+v.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g,',')+suf;
          if(p<1)requestAnimationFrame(step);}
        requestAnimationFrame(step);co.unobserve(el);
      });
    },{threshold:.5});
    document.querySelectorAll('[data-count]').forEach(el=>co.observe(el));
  });
})();
