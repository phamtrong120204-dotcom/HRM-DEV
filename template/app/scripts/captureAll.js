const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const mode = process.argv[2] || 'before';
const targetDir = path.resolve(__dirname, '..', 'screenshots', mode);

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const pages = [
  { name: 'tong-quan', url: 'http://localhost:3005/tong-quan' },
  { name: 'cham-cong', url: 'http://localhost:3005/cham-cong' },
  { name: 'nhan-vien', url: 'http://localhost:3005/nhan-vien' },
  { name: 'bang-luong', url: 'http://localhost:3005/bang-luong' },
  { name: 'thue-bhxh', url: 'http://localhost:3005/thue-bhxh' },
  { name: 'cai-dat', url: 'http://localhost:3005/cai-dat' },
  { name: 'du-lieu', url: 'http://localhost:3005/du-lieu' },
];

const devices = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
];

async function captureOne(page, device) {
  const fileName = `${mode}_${page.name}_${device.name}.png`;
  const outPath = path.join(targetDir, fileName);

  return new Promise((resolve, reject) => {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      `--window-size=${device.width},${device.height}`,
      `--screenshot=${outPath}`,
      page.url
    ];

    execFile(chrome, args, (err) => {
      if (err) {
        console.error(`Error capturing ${fileName}:`, err.message);
        return reject(err);
      }
      if (fs.existsSync(outPath)) {
        const size = fs.statSync(outPath).size;
        console.log(`[OK] Captured ${fileName} (${size} bytes)`);
        resolve(outPath);
      } else {
        reject(new Error(`File ${fileName} was not created`));
      }
    });
  });
}

async function run() {
  console.log(`Starting capture mode: ${mode} into ${targetDir}`);
  const startTime = Date.now();
  let count = 0;

  for (const page of pages) {
    for (const device of devices) {
      await captureOne(page, device);
      count++;
    }
  }

  console.log(`Done capturing ${count} screenshots in ${(Date.now() - startTime) / 1000}s`);
}

run().catch(err => {
  console.error('Fatal error during capture:', err);
  process.exit(1);
});
