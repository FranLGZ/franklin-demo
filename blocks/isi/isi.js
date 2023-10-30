// eslint-disable-next-line import/no-unresolved
import {
  decorateIcons,
  loadBlocks,
  fetchPlaceholders,
  decorateFragment,
  // eslint-disable-next-line import/no-unresolved
} from '../../lib/scripts/lib-franklin.js';

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const isi = document.getElementById('isi');
    if (isi) {
      const block = isi.closest('.block');
      const isiHead = isi.querySelector('.isi-head');
      const button = isiHead.querySelector('button');
      const headingHeight = isiHead.offsetHeight;
      const headingText = isiHead.querySelector('h2').textContent.trim();
      // collapse isi
      document.body.style.overflowY = '';
      block.dataset.state = 'collapsed';
      isi.setAttribute('aria-expanded', false);
      isi.setAttribute(
        'aria-label',
        `${headingText} - ${button.dataset.collapse}`
      );
      block.style.height = `${headingHeight}px`;
      // update button
      button.querySelector('.isi-toggle-text').textContent =
        button.dataset.expand;
      button.setAttribute(
        'aria-label',
        `${button.dataset.expand} ${headingText}`
      );
    }
  }
}

export default async function decorate(block) {
  // element that will be wrapped
  var el = document.querySelector('p.button-container');

  // create wrapper container
  var wrapper = document.createElement('div');

  // insert wrapper before el in the DOM tree
  el.parentNode.insertBefore(wrapper, el);

  // move el into wrapper
  wrapper.appendChild(el);

  const link = block.querySelector('a');
  const path = link ? link.getAttribute('href') : block.textContent.trim();

  const resp = await fetch(`${path}.plain.html`);

  if (resp.ok) {
    const aside = document.createElement('aside');
    aside.innerHTML = await resp.text();
    decorateFragment(aside);
    await loadBlocks(aside);
    block.innerHTML = '';
    block.append(aside);

    const ph = await fetchPlaceholders();

    aside.id = 'isi';
    aside.setAttribute('aria-expanded', true);

    // wrap body content
    const body = document.createElement('div');
    body.className = 'isi-body';
    body.append(...aside.children);
    aside.append(body);

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
    const buttonGroup = document.createElement('div');
    buttonGroup.className =
      'button-container button-container-multi isi-button-container';

    const buttonActions = ['Expand', 'Collapse'];
    buttonActions.forEach((action) => {
      const btn = document.createElement('button');
      btn.className = 'button primary';
      btn.dataset.action = action;
      if (action === 'Collapse')
        btn.disabled = sessionStorage.getItem('isi-expanded') !== 'true';
      btn.setAttribute('type', 'button');
      btn.setAttribute('aria-controls', 'isi');
      btn.setAttribute('aria-label', `${ph[`isi${action}`]} ${headingText}`);
      btn.innerHTML = `<span class="isi-toggle-text">${
        ph[`isi${action}`]
      }</span>
          <span class="icon icon-isi-arrow-${
            action === 'Expand' ? 'up' : 'down'
          }"></span>`;
      buttonGroup.append(btn);
    });
    decorateIcons(buttonGroup);

    const expandBtn = buttonGroup.querySelector('[data-action="Expand"]');
    const collapseBtn = buttonGroup.querySelector('[data-action="Collapse"]');

    expandBtn.addEventListener('click', () => {
      block.dataset.state = 'expanded';
      aside.setAttribute('aria-expanded', true);
      aside.setAttribute('aria-label', `${headingText} - ${ph.isiExpanded}`);
      block.style.height = '';
      document.body.style.overflowY = 'hidden';
      window.addEventListener('keydown', closeOnEscape);
      collapseBtn.disabled = false;
      expandBtn.disabled = true;
      sessionStorage.setItem('isi-expanded', true);
    });

    collapseBtn.addEventListener('click', () => {
      const headingHeight = headingWrapper.offsetHeight;
      block.dataset.state = 'collapsed';
      aside.setAttribute('aria-expanded', false);
      aside.setAttribute('aria-label', `${headingText} - ${ph.isiCollapsed}`);
      block.style.height = `${headingHeight}px`;
      document.body.style.overflowY = '';
      window.removeEventListener('keydown', closeOnEscape);
      collapseBtn.disabled = true;
      expandBtn.disabled = false;
    });

    headingWrapper.querySelector('div').append(buttonGroup);
    aside.prepend(headingWrapper);
    window.addEventListener('resize', () => {
      if (block.dataset.state === 'collapsed') {
        block.style.height = `${headingWrapper.offsetHeight}px`;
      }
    });

    // downgrade headings to prevent duplicate H1s
    if (heading.nodeName === 'H1') {
      aside.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
        const level = parseInt(h.nodeName[1], 10);
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
      height: block.style.height,
      expandBtnDisabled: expandBtn.disabled,
      collapseBtnDisabled: collapseBtn.disabled,
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
                height: block.style.height,
                position: block.style.position,
                expandBtnDisabled: expandBtn.disabled,
                collapseBtnDisabled: collapseBtn.disabled,
              };
            }
            // place isi back in document flow
            block.dataset.state = 'inline';
            aside.setAttribute('aria-expanded', true);
            aside.setAttribute(
              'aria-label',
              `${headingText} - ${ph.isiExpanded}`
            );
            block.style.height = '';
            window.removeEventListener('keydown', closeOnEscape);
            // disable buttons
            expandBtn.disabled = true;
            collapseBtn.disabled = true;
          } else {
            // remove isi from document flow
            block.dataset.state = lastState.state;
            aside.setAttribute('aria-expanded', lastState.expanded);
            aside.setAttribute('aria-label', lastState.label);
            block.style.height = lastState.height;
            // enable buttons
            expandBtn.disabled = lastState.expandBtnDisabled;
            collapseBtn.disabled = lastState.collapseBtnDisabled;
          }
        }
      },
      { threshold: headingWrapper.offsetHeight }
    );

    observer.observe(block.closest('.section'));
  }
}
