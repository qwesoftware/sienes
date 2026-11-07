// The logo for the Word header, fetched from the public folder in the browser.
export async function loadLogo(): Promise<Uint8Array> {
  const response = await fetch("/logo-blue.png");
  if (!response.ok) throw new Error(`Logo request failed: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}
