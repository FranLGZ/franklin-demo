export const libConfig = {
  cmspath: '/cms',
  nonprod_envs: [
    'localhost',
    '.hlx.page',
    '.hlx.reviews',
    '.hlx.live',
    '.franklin.edison.pfizer',
    '.web.pfizer',
  ],
};

export function getConfig(path, defaultValue = null) {
  return libConfig[path] || defaultValue;
}
