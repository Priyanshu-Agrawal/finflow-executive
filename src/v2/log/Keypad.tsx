const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'];

export function Keypad({ onKey }: { onKey: (key: string) => void }) {
  return (
    <div className="l-keys">
      {KEYS.map((k) => (
        <button key={k} type="button" className="l-key" aria-label={k === 'del' ? 'Delete digit' : k} onClick={() => onKey(k)}>
          {k === 'del' ? '⌫' : k}
        </button>
      ))}
    </div>
  );
}
