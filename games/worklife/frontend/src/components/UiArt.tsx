import { withAssetCacheVersion } from '../gameplay/guildFrame';

/**
 * 登录页和提示条用的几张图标：直接引用文件，不经过 T1Art。
 * T1Art 带着整份美术清单（几百个图片地址），只随主界面一起下载，登录页不用等它。输出的标签与 T1Art 相同。
 */
export function UiArt({ src, assetKey, className, alt }: { src: string; assetKey: string; className?: string; alt?: string }) {
  return (
    <img
      className={`t1-art t1-art-icon ${className || ''}`.trim()}
      src={withAssetCacheVersion(src)}
      alt={alt || ''}
      data-t1-key={assetKey}
      data-t1-profile="icon"
    />
  );
}
