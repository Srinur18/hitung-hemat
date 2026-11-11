import curriculum from '@shared/content/curriculum.json';
import glossary from '@shared/content/glossary.json';
import diagnostic from '@shared/content/diagnostic.json';
import assessment from '@shared/content/assessment.json';

export { curriculum, glossary, diagnostic, assessment };

export const modules = curriculum.modules;
export const moduleById = Object.fromEntries(modules.map((m) => [m.id, m]));
