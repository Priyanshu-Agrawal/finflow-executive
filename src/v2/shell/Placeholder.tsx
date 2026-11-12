export function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12 }}>
      <h1 className="v2-title">{title}</h1>
      <p className="v2-cap">{note}</p>
    </section>
  );
}
