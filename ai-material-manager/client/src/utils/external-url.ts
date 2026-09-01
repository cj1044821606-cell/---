/** 系统配置表中的链接可能仍是「待填」占位文本，跳转前必须校验为 http(s) 外链 */
export function isValidExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}
