export const getKey = (key: string) => {
    const ls = localStorage.getItem(key);
    const parsedLs = ls ? ls : null;
    if (!parsedLs) return null;

    return parsedLs;
}