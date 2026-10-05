import { start, setMuted } from '../audio/engine';
import { useAudioState } from '../audio/useAudio';

/** Botón de activación y silencio. Los navegadores no permiten audio sin un gesto. */
export function AudioToggle() {
  const { ready, muted } = useAudioState();
  return (
    <button
      className="toggle2d"
      aria-pressed={ready && !muted}
      onClick={() => (ready ? setMuted(!muted) : void start())}
      title={ready ? 'Silenciar o reactivar el sonido' : 'Activar narración y sonido'}
    >
      {!ready ? '♪ Activar sonido' : muted ? '♪ Sonido en silencio' : '♪ Sonido activo'}
    </button>
  );
}

/** Invitación grande en la portada. */
export function AudioInvite() {
  const { ready } = useAudioState();
  if (ready) return null;
  return (
    <button className="audio-invite" onClick={() => void start()}>
      ♪ Activar narración y sonido
    </button>
  );
}

/** Subtítulos de la narración: la experiencia se entiende igual sin audio. */
export function Subtitles() {
  const { subtitle, voiceInfo } = useAudioState();
  if (!subtitle) return null;
  return (
    <div className="subtitles" role="status" aria-live="polite">
      <p>{subtitle}</p>
      {voiceInfo && <p className="voice-info">{voiceInfo}</p>}
    </div>
  );
}
