export function buildUri(...parts: string[]): string
{
    return parts.map(s => s.replace(/^\/?(.+?)\/?$/, "$1")).join("/");
}