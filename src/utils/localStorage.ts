export const getKey = (key: string) => {
    let ls = localStorage.getItem(key);
    let parsedLs = ls ? ls : null;
    if (!parsedLs) return null;

    return parsedLs;
}