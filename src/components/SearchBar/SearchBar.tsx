import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { docRoutes } from '../../utils/navigation';
import './SearchBar.css';

interface SearchBarProps {
  onClose?: () => void;
}

export function SearchBar({ onClose }: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Toggle modal on Ctrl+K or /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle outside click to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Derive search results from query (no effect needed for derived state)
  const results = useMemo(() => {
    if (!query.trim()) {
      return [];
    }
    const searchTerms = query.toLowerCase().split(' ');
    const filtered = docRoutes.filter((route) => {
      const titleMatch = searchTerms.every((term) =>
        route.title.toLowerCase().includes(term)
      );
      const pathMatch = searchTerms.every((term) =>
        route.path.toLowerCase().includes(term)
      );
      return titleMatch || pathMatch;
    });
    return filtered.slice(0, 8); // limit to 8 results
  }, [query]);

  const handleSelect = (path: string) => {
    navigate(path);
    setIsOpen(false);
    setQuery('');
    if (onClose) onClose();
  };

  return (
    <>
      {/* Search trigger button styled like React Docs */}
      <button 
        className="search-trigger" 
        onClick={() => setIsOpen(true)}
        aria-label="Search documentation"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <span className="search-placeholder">Search docs...</span>
        <kbd className="search-shortcut">Ctrl K</kbd>
      </button>

      {/* Search Modal Backdrop */}
      {isOpen && (
        <div className="search-modal-backdrop">
          <div className="search-modal" ref={modalRef} role="dialog" aria-modal="true">
            <div className="search-modal-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-modal-icon">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                ref={inputRef}
                type="text"
                className="search-modal-input"
                placeholder="Search documentation..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="search-modal-close" onClick={() => setIsOpen(false)}>
                Esc
              </button>
            </div>
            
            <div className="search-modal-results">
              {query && results.length === 0 ? (
                <div className="search-no-results">No results found for "{query}"</div>
              ) : results.length > 0 ? (
                <ul className="search-results-list">
                  {results.map((result) => (
                    <li key={result.path} className="search-result-item" onClick={() => handleSelect(result.path)}>
                      <div className="result-title">{result.title}</div>
                      <div className="result-path">{result.path.replace('/docs/', '')}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="search-empty-state">
                  Type a query to search documentation pages...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
