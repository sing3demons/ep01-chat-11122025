export function getDefinedPaths(
    obj: Record<string, any>,
    parent = ''
): string[] {
    const result: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
        const path = parent ? `${parent}.${key}` : key;

        if (value === null || value === undefined) {
            continue;
        }

        if (typeof value === 'object' && !Array.isArray(value)) {
            const nested = getDefinedPaths(value, path);
            result.push(...nested);
        } else {
            result.push(path);
        }
    }

    return result;
}
