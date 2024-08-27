import fs from "fs/promises";

/**
 * Injects custom scripts into the generated service worker script.
 * @param swContent - The content of the service worker script.
 * @param swPath - The path to the service worker file.
 * @param customWorkerPath - The path to the custom worker script to inject.
 */
export async function injectManifest(
  swContent: string,
  swPath: string,
  customWorkerPath?: string
): Promise<string> {
  let finalContent = swContent;

  if (customWorkerPath) {
    const customWorkerContent = await fs.readFile(customWorkerPath, "utf-8");
    finalContent = `${swContent}\n\n// Custom worker code\n${customWorkerContent}`;
  }

  await fs.writeFile(swPath, finalContent);
  return finalContent;
}
