import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const client = resolve(dist, "client");

await rm(dist, { recursive: true, force: true });
await mkdir(client, { recursive: true });

for (const file of ["index.html", "styles.css", "app.js"]) {
  await cp(resolve(root, file), resolve(client, file));
}

for (const directory of ["assets", "lib"]) {
  await cp(resolve(root, directory), resolve(client, directory), {
    recursive: true,
  });
}

await mkdir(resolve(dist, "server"), { recursive: true });
await writeFile(
  resolve(dist, "server", "index.js"),
  `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    return env.ASSETS.fetch(new Request(new URL("/index.html", request.url)));
  },
};
`,
);

console.log("Built static card site in dist/");
