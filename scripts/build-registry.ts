import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const registry = JSON.parse(readFileSync(resolve(root, 'registry.json'), 'utf-8'));

mkdirSync(resolve(root, 'public/r'), { recursive: true });

for (const item of registry.items) {
  const output = {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: item.name,
    type: item.type,
    title: item.title,
    description: item.description,
    dependencies: item.dependencies,
    registryDependencies: item.registryDependencies,
    files: item.files.map((file: { path: string; type: string }) => ({
      path: file.path,
      type: file.type,
      content: readFileSync(resolve(root, file.path), 'utf-8'),
    })),
  };

  const outPath = resolve(root, `public/r/${item.name}.json`);
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Built: ${outPath}`);
}
