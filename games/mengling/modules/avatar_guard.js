/** 榜上头像只显示图片数据，不显示网址：网址会让看榜的人去请求别人指定的地址。 */
export function isLocalAvatar(value) {
  return typeof value === "string" && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}
