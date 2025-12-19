import path from 'path';
import fs from 'fs';

type TestData = { myData: string };

const filePath = path.join(process.cwd(), 'data', 'test-data.json');
const raw = fs.readFileSync(filePath, { encoding: 'utf8' });
const data = JSON.parse(raw) as TestData;

console.log(data.myData);
