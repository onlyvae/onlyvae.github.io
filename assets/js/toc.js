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
})();
