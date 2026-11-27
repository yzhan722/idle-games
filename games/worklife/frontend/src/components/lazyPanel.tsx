import { Component, Suspense, lazy, useState, type ComponentType, type ReactNode } from 'react';
import { ChunkLoadError, importWithRetry, isNewRelease, reloadIfNewRelease } from '../utils/lazyImport';
import { PanelModal } from './advancement/PanelModal';

/**
 * 打开时才下载的组件：加载中有占位，失败自动重试两次，再失败给「重试」按钮；
 * 发现是发了新版本（旧块 404）：登录页和主界面还没开始玩，整页刷新一次；游戏里的面板只提示，由玩家点刷新。
 * 别的报错照常交给外层 ErrorBoundary。
 */

type BoundaryProps = {
  autoReload: boolean;
  onChunkError: () => void;
  onRetry: () => void;
  failed: (retry: () => void, outdated: boolean) => ReactNode;
  children: ReactNode;
};

class ChunkBoundary extends Component<BoundaryProps, { error: unknown; outdated: boolean }> {
  state: { error: unknown; outdated: boolean } = { error: null, outdated: false };
  private gone = false;

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidMount() {
    this.gone = false;
  }

  componentWillUnmount() {
    this.gone = true;
  }

  componentDidCatch(error: unknown) {
    if (!(error instanceof ChunkLoadError)) return;
    this.props.onChunkError();
    if (this.props.autoReload) void reloadIfNewRelease();
    else void isNewRelease().then((outdated) => { if (!this.gone && outdated) this.setState({ outdated }); });
  }

  retry = () => {
    this.props.onRetry();
    this.setState({ error: null });
  };

  render() {
    const { error, outdated } = this.state;
    if (error === null) return this.props.children;
    if (error instanceof ChunkLoadError) return this.props.failed(this.retry, outdated);
    throw error;
  }
}

type Module<P> = { default: ComponentType<P> };

/** 取到的东西不是组件（比如服务器拿首页顶替了旧块）也算没取到。 */
function asModule<P>(component: unknown): Module<P> {
  if (typeof component !== 'function') throw new Error('代码块里没有这个组件');
  return { default: component as ComponentType<P> };
}

/** 通用外壳：loading / failed 由调用方给。autoReload = 还没进游戏，发了新版本可以直接整页刷新。 */
export function lazyComponent<P extends object>(
  load: () => Promise<Module<P>>,
  view: { autoReload: boolean; loading: (props: P) => ReactNode; failed: (props: P, retry: () => void, outdated: boolean) => ReactNode },
  pick: (mod: unknown) => Module<P> = (mod) => asModule<P>((mod as Module<P>).default)
): ComponentType<P> {
  const make = () => lazy(() => importWithRetry(load, pick));
  // 成功加载过就一直用同一个；失败的那个被 React 记住了，要换新的，重试或下次打开才会真的再取
  let current = make();
  return function LazyComponent(props: P) {
    const [Loaded, setLoaded] = useState(() => current);
    const Inner = Loaded as unknown as ComponentType<P>;
    return (
      <ChunkBoundary
        autoReload={view.autoReload}
        onChunkError={() => { current = make(); }}
        onRetry={() => setLoaded(() => current)}
        failed={(again, outdated) => view.failed(props, again, outdated)}
      >
        <Suspense fallback={view.loading(props)}>
          <Inner {...props} />
        </Suspense>
      </ChunkBoundary>
    );
  };
}

/** 进阶面板：占位和失败提示都用同一个弹窗外壳，随时能关。 */
export function lazyPanel<P extends { onClose: () => void }>(title: string, name: string, load: () => Promise<Record<string, unknown>>): ComponentType<P> {
  const pick = (mod: unknown) => asModule<P>((mod as Record<string, unknown>)[name]);
  return lazyComponent<P>(
    () => load().then(pick),
    {
      autoReload: false,
      loading: (props) => (
        <PanelModal title={title} icon={null} onClose={props.onClose}>
          <div className="prog-loading">加载中…</div>
        </PanelModal>
      ),
      failed: (props, retry, outdated) => (
        <PanelModal title={title} icon={null} onClose={props.onClose}>
          <div className="prog-empty">{outdated ? '游戏更新了，刷新一下' : '没加载出来，看看网络'}</div>
          <div className="lazy-panel-actions">
            {!outdated && <button type="button" className="rb-board-btn" onClick={retry}>重试</button>}
            <button type="button" className="rb-board-btn" onClick={() => window.location.reload()}>刷新页面</button>
          </div>
        </PanelModal>
      ),
    },
    pick
  );
}
