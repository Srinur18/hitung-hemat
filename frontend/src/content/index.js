import curriculum from '@shared/content/curriculum.json';
import glossary from '@shared/content/glossary.json';
import diagnostic from '@shared/content/diagnostic.json';
import assessment from '@shared/content/assessment.json';
import literacy from '@shared/content/literacy.json';
import material from '@shared/content/material.json';
import journey from '@shared/content/journey.json';
import shop from '@shared/content/shop.json';

export { curriculum, glossary, diagnostic, assessment, literacy, material, journey, shop };

export const modules = curriculum.modules;
export const moduleById = Object.fromEntries(modules.map((m) => [m.id, m]));
