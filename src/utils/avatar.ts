/**
 * Male 0
 * Female 1
 * Others 2
 */

type Gender = 0 | 1 | 2;

export const getAvatar = (avatar: string, key: Gender) => {
    const baseS3Url = 'https://wise-tech-asset-store-2.s3.ap-south-1.amazonaws.com';
    const defaultAvatar = [`${baseS3Url}/4c573f1d-0eb9-4292-a6e0-93ad68f8a34d/5f36db9bab326ccf7fc82d4ef56463d45bf45577cc`,
    `${baseS3Url}/4c573f1d-0eb9-4292-a6e0-93ad68f8a34d/2ecc0f7733ae647eefba125ae4aef79cb06371bc11`];

    if (!avatar) {
        if (key === 0 || key) avatar = defaultAvatar[key];
    }

    return avatar;
}