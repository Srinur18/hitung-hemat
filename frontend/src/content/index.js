import curriculum from '@shared/content/curriculum.json';
import glossary from '@shared/content/glossary.json';
import diagnostic from '@shared/content/diagnostic.json';
import assessment from '@shared/content/assessment.json';
import literacy from '@shared/content/literacy.json';
import material from '@shared/content/material.json';

export { curriculum, glossary, diagnostic, assessment, literacy, material };

export const modules = curriculum.modules;
export const moduleById = Object.fromEntries(modules.map((m) => [m.id, m]));
