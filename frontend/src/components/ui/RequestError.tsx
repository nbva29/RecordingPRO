export function RequestError({ error, onRetry }: { error: Error; onRetry: () => unknown }) {
  return (
    <div role="alert">
      <p>{error.message}</p>
      <button type="button" onClick={() => { void onRetry(); }}>Повторить</button>
    </div>
  );
}
