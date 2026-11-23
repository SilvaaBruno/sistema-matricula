import { useEffect, useState, type FormEvent } from 'react';

export function SearchBox({ value, onSearch, placeholder }: { value: string; onSearch: (text: string) => void; placeholder: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]); // acompanha a URL (voltar/avançar)

  function submit(e: FormEvent) {
    e.preventDefault();
    onSearch(text.trim());
  }

  return (
    <form className="search" role="search" onSubmit={submit}>
      <input type="search" aria-label="Buscar" placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} />
      <button className="btn btn-primary">Buscar</button>
      {value && (
        <button type="button" className="btn" onClick={() => onSearch('')}>
          Limpar
        </button>
      )}
    </form>
  );
}
