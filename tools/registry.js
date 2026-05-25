import { adminTools } from './admin.js';
import { dataTools } from './data.js';
import { helperTools } from './helpers.js';

export const allTools = [...dataTools, ...adminTools, ...helperTools];

export function toolByName(name) {
  return allTools.find(t => t.name === name);
}
