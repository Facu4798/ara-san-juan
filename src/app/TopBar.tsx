import { MODULES, openModule, setApp, useApp } from './appStore';
import { useAudioState } from '../audio/useSound';
import { setMuted, setVolume, start } from '../audio/engine';
import { stop as stopStory } from '../story/store';

/**
 * Barra superior: título, cambio entre historia guiada y exploración libre, acceso directo a
 * cada módulo, metodología y sonido (activar, silenciar y volumen).
 */
export function TopBar() {
  const mode = useApp((s) => s.mode);
  const module = useApp((s) => s.module);
  return (
    <header className={`topbar mode-${mode}`}>
      <button type="button" className="brand" onClick={() => setApp({ mode: 'story' })} title="Volver a la historia guiada">
        ARA San Juan
      </button>
      <div className="mode-switch" role="tablist" aria-label="Modo">
        <button type="button" role="tab" aria-selected={mode === 'story'} onClick={() => setApp({ mode: 'story' })}>
          Historia guiada
        </button>
        <button type="button" role="tab" aria-selected={mode === 'explore'} onClick={() => { stopStory(); openModule(module); }}>
          Explorar
        </button>
      </div>
      <nav className="modules" aria-label="Módulos de exploración">
        {MODULES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-current={mode === 'explore' && module === m.id}
            onClick={() => { stopStory(); openModule(m.id); }}
            title={m.label}
          >
            <span className="num">{m.num}</span>
            <span className="long">{m.label}</span>
            <span className="short">{m.short}</span>
          </button>
        ))}
      </nav>
      <div className="tools">
        <button
          type="button"
          className="link"
          onClick={() => (mode === 'explore' ? setApp({ methodologyOpen: true }) : document.getElementById('metodologia')?.scrollIntoView())}
        >
          Fuentes
        </button>
        <SoundControl />
      </div>
    </header>
  );
}

export function SoundControl() {
  const { ready, muted, volume } = useAudioState();
  return (
    <div className="sound-control">
      <button
        type="button"
        aria-pressed={ready && !muted}
        onClick={() => (ready ? setMuted(!muted) : void start())}
        title={!ready ? 'Activar el sonido ambiente' : muted ? 'Activar el sonido' : 'Silenciar'}
      >
        {!ready || muted ? '♪̸' : '♪'}
        <span className="sound-label">{!ready ? 'activar sonido' : muted ? 'silenciado' : 'sonido'}</span>
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={muted ? 0 : volume}
        aria-label="Volumen del sonido ambiente"
        onChange={(e) => {
          if (!ready) void start();
          setVolume(Number(e.target.value));
        }}
      />
    </div>
  );
}
