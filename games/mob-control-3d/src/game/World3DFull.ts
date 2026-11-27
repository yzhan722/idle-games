import { JungleSwingMode } from './modes/JungleSwing';

/**
 * 完整的 3D 世界：World3D（公共流程、字段、主战役）→ modes/ 里的各独立模式，一级级继承。
 * 各模式文件只有方法、没有字段，所以字段初始化与构造顺序和拆分前完全一样。
 */
export class World3DFull extends JungleSwingMode {}
