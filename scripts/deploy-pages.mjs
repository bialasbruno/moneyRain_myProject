import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const projectName = 'money-rain';
const pagesToken = process.env.PAGES_API_TOKEN;

if (!pagesToken) {
  console.error('Missing required build secret: PAGES_API_TOKEN');
  process.exit(1);
}

const wrangler = resolve(
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler',
);
const env = {
  ...process.env,
  CLOUDFLARE_API_TOKEN: pagesToken,
};

function run(args, captureOutput = false) {
  const result = spawnSync(wrangler, args, {
    encoding: 'utf8',
    env,
    stdio: captureOutput ? ['inherit', 'pipe', 'inherit'] : 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result.stdout ?? '';
}

const projects = JSON.parse(run(['pages', 'project', 'list', '--json'], true));
const projectExists = projects.some((project) => project.name === projectName);

if (!projectExists) {
  console.log(`Creating Cloudflare Pages project "${projectName}"...`);
  run(['pages', 'project', 'create', projectName, '--production-branch', 'main']);
}

run(['pages', 'deploy', 'dist', '--project-name', projectName]);
