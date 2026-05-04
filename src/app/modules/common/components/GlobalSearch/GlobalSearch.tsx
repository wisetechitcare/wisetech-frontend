import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { KTIcon } from '@metronic/helpers';
import { HighlightMatch, performGlobalSearch, UnifiedSearchResult, SearchMatchField } from '@app/utils/search';
import './GlobalSearch.css';

// Shared type from search utility is used instead of local interface

const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Gmail-like shortcut '/' to focus search
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // Search logic with debounce
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await performGlobalSearch(query);
        setResults(results);
        setIsOpen(true);
        setActiveIndex(-1);
      } catch (error) {
        console.error('Global search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > -1 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        navigate(results[activeIndex].path);
        setIsOpen(false);
      } else {
        // Go to "View All" page
        navigate(`/search-results?q=${encodeURIComponent(query)}`);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleResultClick = (path: string) => {
    navigate(path);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="global-search-container" ref={dropdownRef}>
      <div className={`global-search-input-wrapper ${isOpen ? 'active' : ''}`}>
        <KTIcon iconName="magnifier" className="search-icon fs-2 text-muted" />
        <input
          ref={inputRef}
          type="text"
          className="form-control global-search-input"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
        />
        {isLoading && (
          <div className="search-spinner-wrapper">
            <span className="spinner-border spinner-border-sm text-primary"></span>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="global-search-dropdown shadow-sm rounded">
          {results.length > 0 ? (
            <div className="search-results-list">
              {['Navigation', 'KPI', 'Company', 'Contact', 'Lead', 'Project', 'Employee', 'Task'].map((type) => {
                const typeResults = results.filter(r => r.type === type).slice(0, 5);
                if (typeResults.length === 0) return null;

                const sectionLabels: Record<string, string> = {
                  Navigation: 'Pages / Navigation',
                  KPI: 'Dashboard / KPIs',
                  Company: 'Companies',
                  Contact: 'Contacts',
                  Lead: 'Leads',
                  Project: 'Projects',
                  Employee: 'Employees',
                  Task: 'Tasks'
                };

                return (
                  <div key={type} className="search-section border-bottom border-gray-200 last:border-0">
                    <div className="search-section-header bg-light-gray px-4 py-2 d-flex justify-content-between align-items-center">
                      <span className="section-title fw-bold text-gray-700 fs-8 text-uppercase tracking-wider">{sectionLabels[type]}</span>
                      <span className="section-count badge badge-light-primary fs-9">{results.filter(r => r.type === type).length}</span>
                    </div>
                    {typeResults.map((result: UnifiedSearchResult) => {
                      const absoluteIdx = results.indexOf(result);
                      const matchingField = result.matches?.find((m: SearchMatchField) => m.isMatch);
                      
                      return (
                        <div
                          key={result.id}
                          className={`search-result-item d-flex align-items-center px-4 py-3 cursor-pointer transition-all ${
                            activeIndex === absoluteIdx ? 'bg-light-primary' : 'hover-bg-light'
                          }`}
                          onClick={() => {
                            navigate(result.path);
                            setIsOpen(false);
                            setQuery('');
                          }}
                        >
                          <div className="symbol symbol-30px me-3">
                            <span className={`symbol-label bg-light-${getTypeColor(result.type)}`}>
                              <KTIcon iconName={result.icon} className={`fs-4 text-${getTypeColor(result.type)}`} />
                            </span>
                          </div>
                          <div className="d-flex flex-column flex-grow-1 overflow-hidden">
                            <span className="fs-7 fw-bold text-gray-800 text-truncate">
                              <HighlightMatch text={result.title} query={query} />
                            </span>
                            <div className="d-flex align-items-center gap-2 mt-1">
                              {matchingField ? (
                                <span className="fs-9 text-muted d-flex align-items-center">
                                  <span className="fw-bold me-1">{matchingField.label}:</span>
                                  <HighlightMatch text={matchingField.value} query={query} />
                                </span>
                              ) : (
                                <span className="fs-9 text-muted text-truncate">{result.subtitle}</span>
                              )}
                            </div>
                          </div>
                          {matchingField && (
                            <span className="badge badge-light-warning fs-10 py-0 px-1 ms-2">Match</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div className="search-footer" onClick={() => navigate(`/search-results?q=${encodeURIComponent(query)}`)}>
                <span>Press Enter to see all results</span>
                <KTIcon iconName="return" className="fs-4" />
              </div>
            </div>
          ) : (
            <div className="search-empty-state">
              <KTIcon iconName="search" className="fs-1 text-muted mb-2" />
              <p>No results found for "{query}"</p>
              <span className="text-muted fs-7">Try searching by name, phone, or project code</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'Navigation': return 'primary';
    case 'KPI': return 'info';
    case 'Navigation': return 'primary';
    case 'KPI': return 'info';
    case 'Company': return 'primary';
    case 'Contact': return 'success';
    case 'Lead': return 'warning';
    case 'Project': return 'info';
    case 'Employee': return 'danger';
    case 'Task': return 'dark';
    default: return 'primary';
  }
};

export default GlobalSearch;
