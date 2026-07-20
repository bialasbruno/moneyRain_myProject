import { Component, lazy, Suspense, type ReactNode } from 'react';
import { CoreFallback } from './CoreFallback';

const CoreScene3D = lazy(() => import('./CoreScene3D'));

class CoreErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    // Bez logowania prywatnych danych. Fallback zachowuje pełną informację o progresie.
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function hasWebGl() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function CapitalCore({
  progress,
  effects,
}: {
  progress: number;
  effects: 'FULL' | 'LIMITED' | 'OFF';
}) {
  const fallback = <CoreFallback progress={progress} />;
  if (effects === 'OFF' || !hasWebGl()) return fallback;
  return (
    <div className="core-3d" data-quality={effects === 'LIMITED' ? 'low' : 'high'}>
      <CoreErrorBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <CoreScene3D progress={progress} />
        </Suspense>
      </CoreErrorBoundary>
    </div>
  );
}
