import fs from 'fs';
const s = fs.readFileSync('src/app/modules/common/components/MaterialTableImpl.tsx', 'utf8');
console.log('CRLF', s.includes('\r\n'));
const start = s.indexOf('{/* Column Selector */}');
const assist = s.indexOf('Result count for assistive tech');
console.log('start', start, 'assist', assist);
console.log(JSON.stringify(s.slice(assist - 80, assist + 40)));
