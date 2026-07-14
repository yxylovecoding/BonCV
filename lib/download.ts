export function attachmentDisposition(name: string, extension: 'pdf' | 'tex') {
  const slug = name.replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '') || 'resume';
  const asciiSlug = slug.replace(/[^a-zA-Z0-9-]+/g, '').replace(/^-|-$/g, '') || 'resume';
  const filename = `BonCV-${slug}.${extension}`;
  const asciiFilename = `BonCV-${asciiSlug}.${extension}`;
  const encodedFilename = encodeURIComponent(filename).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
}
