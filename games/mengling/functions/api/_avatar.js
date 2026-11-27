// 头像只收本机压好的位图数据。外部网址会让每个看榜的人去请求那个地址（暴露 IP，也可能被换成别的图），一律不收。
const AVATAR_MAX = 200000;
const AVATAR_RE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export function cleanAvatar(value) {
  if (typeof value !== "string" || value.length > AVATAR_MAX) return "";
  return AVATAR_RE.test(value) ? value : "";
}
