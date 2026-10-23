const lang = document.body.dataset.lang;
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#site-nav');
function closeMenu() { toggle?.setAttribute('aria-expanded', 'false'); nav?.classList.remove('is-open'); }
toggle?.addEventListener('click', () => {
  const opened = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(opened));
  toggle.setAttribute('aria-label', lang === 'zh' ? (opened ? '关闭菜单' : '菜单') : (opened ? 'Close menu' : 'Menu'));
  nav.classList.toggle('is-open', opened);
});
nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => { if(e.key === 'Escape') { closeMenu(); toggle?.focus(); } });
document.querySelector('[data-copy]')?.addEventListener('click', async e => {
  const button = e.currentTarget;
  const status = document.querySelector('.copy-status');
  try { await navigator.clipboard.writeText(button.dataset.copy); status.textContent = button.dataset.done; }
  catch { status.textContent = button.dataset.failed; }
});

const blog = document.querySelector('[data-blog]');
if (blog) {
  const input = document.querySelector('#article-search');
  const form = document.querySelector('.search-form');
  const cards = [...document.querySelectorAll('[data-post-slug]')];
  const topicLinks = [...document.querySelectorAll('[data-tag]')];
  const clear = document.querySelector('#clear-filters');
  const empty = document.querySelector('#search-empty');
  const count = document.querySelector('#result-count');
  const pagination = document.querySelector('.pagination');
  const pageNumber = document.querySelector('#page-number');
  const prev = document.querySelector('#prev-page'), next = document.querySelector('#next-page');
  const normalize = s => s.normalize('NFKC').toLocaleLowerCase();
  let records = [], activeTag = blog.dataset.activeTag, page = 1;
  const size = 6;
  const readLocation = () => { const params = new URLSearchParams(location.search); input.value = params.get('q') || ''; activeTag = params.has('tag') ? params.get('tag') : blog.dataset.activeTag; page = Math.max(1, Number(params.get('page')) || 1); };
  function update(writeUrl = true) {
    const query = normalize(input.value.trim());
    const matches = records.filter(p => (!activeTag || p.tags.includes(activeTag)) && (!query || normalize([p.title,p.description,...p.tags,p.text].join(' ')).includes(query)));
    const pages = Math.max(1, Math.ceil(matches.length / size));
    page = Math.min(pages, Math.max(1, Math.floor(page)));
    const visible = new Set(matches.slice((page - 1) * size, page * size).map(p => p.slug));
    cards.forEach(card => { card.hidden = !visible.has(card.dataset.postSlug); });
    count.textContent = `${matches.length} ${lang === 'zh' ? '篇文章' : matches.length === 1 ? 'article' : 'articles'}`;
    empty.hidden = matches.length > 0 || records.length === 0;
    clear.hidden = !query && !activeTag;
    document.querySelector('#initial-empty')?.setAttribute('hidden', '');
    if(records.length === 0) document.querySelector('#initial-empty')?.removeAttribute('hidden');
    topicLinks.forEach(a => { if(a.dataset.tag === activeTag) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
    pagination.hidden = pages <= 1;
    prev.disabled = page <= 1; next.disabled = page >= pages;
    pageNumber.textContent = `${page} / ${pages}`;
    if(writeUrl) {
      const url = new URL(location.href);
      url.search = '';
      if(input.value.trim()) url.searchParams.set('q', input.value.trim());
      if(activeTag !== blog.dataset.activeTag) url.searchParams.set('tag', activeTag);
      if(page > 1) url.searchParams.set('page', page);
      history.replaceState(null, '', url);
    }
  }
  try {
    const response = await fetch(`/${lang}/search.json`);
    if(!response.ok) throw new Error('Search index unavailable');
    records = await response.json();
    // Tag pages contain their own subset for no-JS readers. Fetch only missing card markup from the main list.
    if(blog.dataset.activeTag) {
      const result = await fetch(`/${lang}/blog/`);
      if(!result.ok) throw new Error('Article list unavailable');
      const documentCopy = new DOMParser().parseFromString(await result.text(), 'text/html');
      for(const card of documentCopy.querySelectorAll('[data-post-slug]')) {
        if(!cards.some(c=>c.dataset.postSlug === card.dataset.postSlug)) { const item = document.importNode(card, true); document.querySelector('#posts-grid').append(item); cards.push(item); }
      }
    }
    cards.sort((a,b)=>records.findIndex(p=>p.slug===a.dataset.postSlug)-records.findIndex(p=>p.slug===b.dataset.postSlug));
    cards.forEach(card=>document.querySelector('#posts-grid').append(card));
    readLocation(); update(false);
    form.addEventListener('submit', e => { e.preventDefault(); page = 1; update(); });
    input.addEventListener('input', () => { page = 1; update(); });
    topicLinks.forEach(a => a.addEventListener('click', e => { e.preventDefault(); activeTag = a.dataset.tag; page = 1; update(); }));
    clear.addEventListener('click', () => { input.value = ''; activeTag = ''; page = 1; update(); input.focus(); });
    prev.addEventListener('click', () => { page--; update(); document.querySelector('.results-line').scrollIntoView({block:'start'}); });
    next.addEventListener('click', () => { page++; update(); document.querySelector('.results-line').scrollIntoView({block:'start'}); });
    window.addEventListener('popstate', () => { readLocation(); update(false); });
  } catch {
    form.addEventListener('submit', e => e.preventDefault());
    input.disabled = true;
    document.querySelector('#search-help').textContent = lang === 'zh' ? '搜索暂不可用，仍可通过下方列表和主题链接阅读文章。' : 'Search is temporarily unavailable. Browse the articles and topic links below.';
  }
}
