import { verify } from "jsonwebtoken";
import { readFileSync } from "fs";
import { join, resolve } from "path";

export const decodeToken = (token: string) => {
    const path = join(resolve('./src'), '/keys/public.key');
    const PUBLIC_KEY = readFileSync(path, 'utf8');
    const decodedToken = verify(token, PUBLIC_KEY);
    return decodedToken;
};