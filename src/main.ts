import './style.css';
import { LABS, type LabEntry } from './labs';

const list = document.querySelector<HTMLUListElement>('#lab-list');

if (list) {
  for (const lab of LABS) {
    list.append(renderCard(lab));
  }
}

function renderCard(lab: LabEntry): HTMLLIElement {
  const item = document.createElement('li');
  item.className = `hub__card hub__card--${lab.status}`;

  const isDisponivel = lab.status === 'disponivel';

  const badge = document.createElement('span');
  badge.className = `hub__badge hub__badge--${lab.status}`;
  badge.textContent = isDisponivel ? 'Disponível para Prática' : 'Em Desenvolvimento';

  const heading = document.createElement('h2');
  heading.className = 'hub__card-title';

  const summary = document.createElement('p');
  summary.className = 'hub__summary';
  summary.textContent = lab.summary;

  const topics = document.createElement('div');
  topics.className = 'hub__topics';
  for (const topic of lab.topics) {
    const pill = document.createElement('span');
    pill.className = 'hub__topic-pill';
    pill.textContent = topic;
    topics.appendChild(pill);
  }

  if (isDisponivel) {
    const link = document.createElement('a');
    link.href = lab.href;
    link.className = 'hub__card-link';
    link.textContent = lab.title;
    heading.append(link);

    const action = document.createElement('span');
    action.className = 'hub__action';
    action.innerHTML = 'Abrir Experimento <span aria-hidden="true">→</span>';

    item.append(badge, heading, summary, topics, action);

    // Permite clicar em todo o card de forma acessível e natural
    item.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName !== 'A') {
        link.click();
      }
    });
  } else {
    const pending = document.createElement('span');
    pending.className = 'hub__pending';
    pending.textContent = lab.title;
    heading.append(pending);

    item.append(badge, heading, summary, topics);
  }

  return item;
}