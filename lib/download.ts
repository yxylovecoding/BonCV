function disposition(name: string, extension: 'pdf' | 'tex', type: 'attachment' | 'inline') {
  const slug = name.replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '') || 'resume';
  const asciiSlug = slug.replace(/[^a-zA-Z0-9-]+/g, '').replace(/^-|-$/g, '') || 'resume';
  const filename = `BonCV-${slug}.${extension}`;
  const asciiFilename = `BonCV-${asciiSlug}.${extension}`;
  const encodedFilename = encodeURIComponent(filename).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${type}; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
}

export function attachmentDisposition(name: string, extension: 'pdf' | 'tex') {
  return disposition(name, extension, 'attachment');
}

export function inlineDisposition(name: string, extension: 'pdf' | 'tex') {
  return disposition(name, extension, 'inline');
}
