import {
  decorateIcons,
  loadBlocks,
  fetchPlaceholders,
} from '../../scripts/lib-franklin.js';
import { decorateMain } from '../../scripts/scripts.js';

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const isi = document.getElementById('isi');
    if (isi) {
      const block = isi.closest('.block');
      const isiHead = isi.querySelector('.isi-head');
      const headingHeight = isiHead.offsetHeight;
      const headingText = isiHead.querySelector('h2').textContent.trim();
      // collapse isi
      document.body.style.overflowY = '';
      block.dataset.state = 'collapsed';
      isi.setAttribute('aria-expanded', false);
      isi.setAttribute('aria-label', `${headingText} - Collapsed`);
      block.style.top = `${window.innerHeight - headingHeight}px`;
      block.style.position = 'fixed';
    }
  }
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  const path = link ? link.getAttribute('href') : block.textContent.trim();

  const resp = await fetch(`${path}.plain.html`);

  if (resp.ok) {
    const aside = document.createElement('aside');
    aside.innerHTML = await resp.text();
    decorateMain(aside, true);
    await loadBlocks(aside);
    block.innerHTML = '';
    block.append(aside);

    const ph = await fetchPlaceholders();

    aside.id = 'isi';
    aside.setAttribute('aria-expanded', true);
    block.style.position = 'fixed';
    block.style.top = '80vh';

    // build "back" button
    const backBtn = document.createElement('button');
    backBtn.className = 'isi-back';
    backBtn.setAttribute('aria-controls', 'isi');
    backBtn.setAttribute('type', 'button');
    backBtn.setAttribute('aria-label', ph.isiBack);
    backBtn.addEventListener('click', () => {
      backBtn.blur();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    block.closest('.section').prepend(backBtn);

    // wrap body content
    const body = document.createElement('div');
    body.className = 'isi-body';
    body.append(...aside.children);
    aside.append(body);

    // build patient disclaimer banner
    try {
      const disc = await fetch('/global/patient-disclaimer.plain.html');
      const temp = document.createElement('div');
      temp.innerHTML = await disc.text();
      // TODO: remove section metadata from patient-disclaimer fragment
      if (temp.querySelector('[class]')) {
        temp.querySelectorAll('[class]').forEach((c) => c.remove());
      }
      const banner = document.createElement('div');
      banner.innerHTML = temp.firstElementChild.innerHTML;
      banner.className = 'default-content-wrapper isi-patient-disclaimer';
      body.lastElementChild.append(banner);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Could not inject patient disclaimer:', error);
    }

    // build and decorate heading
    const headingWrapper = document.createElement('div');
    headingWrapper.className = 'isi-head';
    const heading = aside.querySelector('h1, h2');
    if (heading) {
      headingWrapper.innerHTML = `<div class="section">${heading.outerHTML}</div>`;
      heading.remove();
    } else {
      // create synthetic heading
      headingWrapper.innerHTML = `<div class="section"><h2>${ph.isiFallbackTitle}</h2></div>`;
    }
    const headingText = headingWrapper.textContent.trim();
    aside.setAttribute('aria-label', `${headingText} - ${ph.isiPartial}`);
    block.dataset.state = 'partial';

    // build buttons
    const collapseBtn = document.createElement('button');
    const expandBtn = document.createElement('button');

    collapseBtn.className = 'isi-collapse';
    collapseBtn.setAttribute('aria-controls', 'isi');
    collapseBtn.setAttribute('aria-label', ph.isiCollapse);
    collapseBtn.setAttribute('type', 'button');
    collapseBtn.innerHTML = `<span class="isi-btn-text isi-collapse">${ph.isiCollapse}</span>
      <span class="icon icon-collapse-icon"></span>`;
    collapseBtn.addEventListener('click', () => {
      collapseBtn.disabled = true;
      expandBtn.disabled = false;
      block.classList.remove('viewed');
      block.dataset.state = 'collapsed';
      aside.setAttribute('aria-expanded', false);
      aside.setAttribute('aria-label', `${headingText} - ${ph.isiCollapsed}`);
      const headingHeight = headingWrapper.offsetHeight;
      block.style.top = `${window.innerHeight - headingHeight}px`;
      document.body.style.overflowY = '';
      window.removeEventListener('keydown', closeOnEscape);
    });
    // display collapse button based on session
    const isiViewed = sessionStorage.getItem('isiViewed');
    if (!isiViewed) collapseBtn.classList.add('disabled');
    else block.classList.add('viewed');

    expandBtn.className = 'isi-expand';
    expandBtn.setAttribute('aria-controls', 'isi');
    expandBtn.setAttribute('aria-label', ph.isiFindOutMore);
    expandBtn.setAttribute('type', 'button');
    expandBtn.innerHTML = `<span class="isi-btn-text">${ph.isiFindOutMore}</span>
    <span class="icon icon-mobile-expand-icon"></span>
    <span class="icon icon-expand-icon"></span>`;
    expandBtn.addEventListener('click', () => {
      sessionStorage.setItem('isiViewed', true);
      collapseBtn.classList.remove('disabled');
      expandBtn.disabled = true;
      collapseBtn.disabled = false;
      block.dataset.state = 'expanded';
      aside.setAttribute('aria-expanded', true);
      aside.setAttribute('aria-label', `${headingText} - ${ph.isiExpanded}`);
      block.style.top = 0;
      document.body.style.overflowY = 'hidden';
      window.addEventListener('keydown', closeOnEscape);
    });

    const btnContainer = document.createElement('div');
    btnContainer.className = 'button-container';
    btnContainer.append(expandBtn, collapseBtn);
    decorateIcons(btnContainer);
    headingWrapper.querySelector('div').append(btnContainer);
    aside.prepend(headingWrapper);
    window.addEventListener('resize', () => {
      if (!block.style.top.includes('vh') && block.style.top !== '0px') {
        block.style.top = `${
          window.innerHeight - headingWrapper.offsetHeight
        }px`;
      }
    });

    // downgrade headings to prevent duplicate H1s
    if (heading.nodeName === 'H1') {
      aside.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
        const level = parseInt(h.nodeName[1], 10);
        const a = h.querySelector('a[href]');
        // use anchors to replace ids
        if (a && a.textContent === h.textContent) {
          const { hash } = new URL(a.href);
          if (hash) {
            h.id = `isi-${hash.substring(1)}`;
            h.innerHTML = a.innerHTML;
          }
        }
        if (level < 5) {
          const newH = document.createElement(`h${level + 1}`);
          newH.id = h.id;
          newH.innerHTML = h.innerHTML;
          h.replaceWith(newH);
        } else {
          // downgrad h6 to p > strong
          const p = document.createElement('p');
          p.id = h.id;
          p.innerHTML = `<strong>${h.innerHTML}</strong>`;
          h.replaceWith(p);
        }
      });
    }

    // morph to full isi when scrolled to bottom of page
    let lastState = {
      state: block.dataset.state,
      expanded: aside.getAttribute('aria-expanded'),
      label: aside.getAttribute('aria-label'),
      top: block.style.top,
    };
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].boundingClientRect.y > 0) {
          const observed = entries.find((entry) => entry.isIntersecting);
          if (observed) {
            if (lastState.state !== 'inline') {
              lastState = {
                state: block.dataset.state,
                expanded: aside.getAttribute('aria-expanded'),
                label: aside.getAttribute('aria-label'),
                top: block.style.top,
                position: block.style.position,
              };
            }
            // place isi back in document flow
            block.dataset.state = 'inline';
            aside.setAttribute('aria-expanded', true);
            aside.setAttribute(
              'aria-label',
              `${headingText} - ${ph.isiExpanded}`
            );
            block.style.top = 'unset';
            block.style.position = 'static';
            window.removeEventListener('keydown', closeOnEscape);
          } else {
            // remove isi from document flow
            block.dataset.state = lastState.state;
            aside.setAttribute('aria-expanded', lastState.expanded);
            aside.setAttribute('aria-label', lastState.label);
            block.style.top = lastState.top;
            block.style.position = 'fixed';
          }
        }
      },
      { threshold: headingWrapper.offsetHeight }
    );

    observer.observe(block.closest('.section'));
  }
}
