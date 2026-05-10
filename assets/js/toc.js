(() => {
  const toc = document.querySelector('.post-toc');
  const content = document.querySelector('.post-content');
  if (!toc || !content) return;

  const headings = content.querySelectorAll('h2, h3');
  if (!headings.length) return;

  const list = toc.querySelector('.toc-list');
  let section = null;
  let sublist = null;

  headings.forEach((heading, index) => {
    if (!heading.id) {
      let id = `toc-heading-${index + 1}`;
      while (document.getElementById(id)) id += '-';
      heading.id = id;
    }

    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${encodeURIComponent(heading.id)}`;
    link.textContent = heading.textContent.trim();
    item.append(link);

    if (heading.tagName === 'H3' && section) {
      if (!sublist) {
        sublist = document.createElement('ul');
        section.append(sublist);
      }
      sublist.append(item);
    } else {
      list.append(item);
      section = heading.tagName === 'H2' ? item : null;
      sublist = null;
    }
  });

  toc.hidden = false;

  const floating = toc.cloneNode(true);
  floating.classList.add('post-toc-floating');
  floating.setAttribute('aria-label', '浮动文章目录');
  floating.hidden = true;
  document.body.append(floating);

  const details = floating.querySelector('details');
  const wideScreen = matchMedia('(min-width: 1400px)');
  details.open = wideScreen.matches;
  wideScreen.addEventListener('change', () => {
    details.open = wideScreen.matches;
  });
  floating.addEventListener('click', (event) => {
    if (!wideScreen.matches && event.target.closest('a[href]')) details.open = false;
  });

  let updatePending = false;
  function updateVisibility() {
    updatePending = false;
    const visible = toc.getBoundingClientRect().bottom <= 0;
    if (!visible && !floating.hidden && !wideScreen.matches) details.open = false;
    floating.hidden = !visible;
  }

  function scheduleUpdate() {
    if (updatePending) return;
    updatePending = true;
    requestAnimationFrame(updateVisibility);
  }

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  new ResizeObserver(scheduleUpdate).observe(toc);
  updateVisibility();
})();
