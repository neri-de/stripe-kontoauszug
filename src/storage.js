import fs from 'node:fs/promises';
import path from 'node:path';
import {period} from './report.js';
export const dataDir=path.resolve('data');
export async function documents(month){period(month);try{return JSON.parse(await fs.readFile(path.join(dataDir,month,'documents.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return [];throw e;}}
