import { readFileSync } from 'fs';
import { resolve } from 'path';
import { AnswerSheetScannerService } from '../answer-sheet-scanner.service';

async function main() {
  const fileArg = process.argv[2];
  const totalArg = process.argv[3];
  if (!fileArg) {
    console.error(
      'Usage: npm run scan:sheet -- <path-to-image> [totalQuestions]',
    );
    process.exit(1);
  }
  const p = resolve(fileArg);
  const buf = readFileSync(p);
  const svc = new AnswerSheetScannerService();
  const total = totalArg ? parseInt(totalArg, 10) : NaN;
  if (!isNaN(total) && total > 0) {
    const res = await svc.detectAnswersFromImage(buf, total);
    console.log(JSON.stringify(res, null, 2));
  } else {
    const res = await svc.detectAnswersAuto(buf);
    console.log(JSON.stringify(res, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
