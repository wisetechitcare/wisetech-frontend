import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KTIcon } from '@metronic/helpers';
import { HighlightMatch, performGlobalSearch, UnifiedSearchResult, SearchMatchField } from '@app/utils/search';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExploreIcon from '@mui/icons-material/Explore';
import AssessmentIcon from '@mui/icons-material/Assessment';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import './GlobalSearch.css';

// Shared type from search utility is used instead of local interface

const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // For mobile full-screen
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [filterType, setFilterType] = useState<string>('All');
  const [history, setHistory] = useState<string[]>([]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync isExpanded with isOpen for consistency
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => mobileInputRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  // Deep Linking: Sync query with URL
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== query) {
      setQuery(q);
      setIsOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (query.trim()) {
      setSearchParams({ q: query }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [query]);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('global_search_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const addToHistory = (q: string) => {
    if (!q || q.trim().length < 2) return;
    const newHistory = [q, ...history.filter(h => h !== q)].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('global_search_history', JSON.stringify(newHistory));
  };

  const removeFromHistory = (e: React.MouseEvent, q: string) => {
    e.stopPropagation();
    const newHistory = history.filter(h => h !== q);
    setHistory(newHistory);
    localStorage.setItem('global_search_history', JSON.stringify(newHistory));
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
      
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [history]);

  // Search logic with debounce
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsOpen(query.trim().length > 0);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const searchResults = await performGlobalSearch(query);
        setResults(searchResults);
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
    const filteredResults = filterType === 'All' ? results : results.filter(r => r.type === filterType);
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > -1 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        addToHistory(query);
        navigate(filteredResults[activeIndex].path);
        setIsOpen(false);
      } else {
        addToHistory(query);
        navigate(`/search-results?q=${encodeURIComponent(query)}`);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleResultClick = (result: UnifiedSearchResult) => {
    // Analytics (Phase 4)
    console.log(`[Search Analytics] Selected ${result.type}: ${result.title} (ID: ${result.id})`);
    
    addToHistory(query);
    navigate(result.path);
    setIsOpen(false);
    setIsExpanded(false);
    setQuery('');
  };

  const filterMap: Record<string, string> = {
    'All': 'All',
    'Projects': 'Project',
    'Leads': 'Lead',
    'Companies': 'Company',
    'Contacts': 'Contact',
    'Employees': 'Employee',
    'Tasks': 'Task',
    'Pages': 'Navigation'
  };

  const filteredResults = filterType === 'All' ? results : results.filter(r => r.type === filterMap[filterType]);
  const bestMatches = results.slice(0, 3);
  const types = ['All', 'Projects', 'Leads', 'Companies', 'Contacts', 'Employees', 'Tasks', 'Pages'];

  return (
    <div className={`global-search-container ${isMobile ? 'mobile-mode' : ''}`} ref={dropdownRef}>
      {isMobile ? (
        <button 
          className="btn btn-icon btn-active-light-primary w-40px h-40px rounded-circle"
          onClick={() => setIsExpanded(true)}
        >
          <KTIcon iconName="magnifier" className="fs-2 text-primary" />
        </button>
      ) : (
        <div className={`global-search-input-wrapper ${isOpen ? 'active' : ''}`}>
          <AutoAwesomeIcon sx={{ fontSize: '1.6rem', color: '#009ef7', position: 'absolute', left: '12px', zIndex: 2 }} />
          <input
            ref={inputRef}
            type="text"
            className="form-control global-search-input"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
          />
          {isLoading && (
            <div className="search-spinner-wrapper">
              <span className="spinner-border spinner-border-sm text-primary"></span>
            </div>
          )}
        </div>
      )}

      {/* Desktop Dropdown OR Mobile Full Screen Overlay */}
      {(isOpen || isExpanded) && (
        <div className={`global-search-dropdown ${isExpanded ? 'is-expanded' : ''} shadow-lg rounded-xl overflow-hidden`}>
          {isExpanded && (
            <div className="mobile-search-header p-4 border-bottom d-flex align-items-center gap-3">
              <button className="btn btn-icon btn-sm" onClick={() => setIsExpanded(false)}>
                <KTIcon iconName="arrow-left" className="fs-1" />
              </button>
              <div className="flex-grow-1 position-relative">
                <input
                  ref={mobileInputRef}
                  type="text"
                  className="form-control border-0 fs-5 px-0"
                  placeholder="Search everything..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              {isLoading && <span className="spinner-border spinner-border-sm text-primary"></span>}
            </div>
          )}
          {/* Filters Bar */}
          <div className="search-filters-bar px-4 py-2 border-bottom bg-gray-50 d-flex gap-2 overflow-auto">
            {types.map(t => (
              <button
                key={t}
                className={`btn btn-sm btn-flex py-1 px-3 fs-9 fw-bold rounded-pill transition-all ${filterType === t ? 'btn-primary' : 'btn-light text-gray-600'}`}
                onClick={() => setFilterType(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {query.length < 2 && history.length > 0 && (
            <div className="search-history-section px-4 py-3">
              <div className="fs-9 fw-bold text-gray-500 text-uppercase mb-2 d-flex justify-content-between align-items-center">
                <span>Recent Searches</span>
                <span className="cursor-pointer hover-text-primary transition-all" onClick={() => { setHistory([]); localStorage.removeItem('global_search_history'); }}>Clear All</span>
              </div>
              {history.map((h, i) => (
                <div 
                  key={i} 
                  className="history-item d-flex align-items-center justify-content-between py-2 cursor-pointer hover-bg-light rounded px-2 group"
                  onClick={() => setQuery(h)}
                >
                  <div className="d-flex align-items-center">
                    <KTIcon iconName="time" className="fs-6 text-gray-400 me-2" />
                    <span className="fs-7 text-gray-700">{h}</span>
                  </div>
                  <button 
                    className="btn btn-icon btn-sm btn-active-light-danger opacity-0 group-hover:opacity-100 transition-all h-20px w-20px"
                    onClick={(e) => removeFromHistory(e, h)}
                  >
                    <KTIcon iconName="cross" className="fs-9" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="search-skeleton-loader p-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton-item d-flex align-items-center mb-4">
                  <div className="skeleton-circle me-3"></div>
                  <div className="skeleton-lines flex-grow-1">
                    <div className="skeleton-line-long mb-2"></div>
                    <div className="skeleton-line-short"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : query.length >= 2 && results.length > 0 ? (
            <div className="search-results-list scroll-y mh-400px">
              {/* Best Match Section */}
              {filterType === 'All' && bestMatches.length > 0 && (
                <div className="search-section bg-light-primary-subtle border-bottom border-gray-200">
                  <div className="search-section-header px-4 py-2 d-flex align-items-center">
                    <span className="section-title fw-bold text-primary fs-8 text-uppercase">Best Match</span>
                  </div>
                  {bestMatches.map((result) => (
                    <div
                      key={`best-${result.id}`}
                      className={`search-result-item d-flex align-items-center px-4 py-3 cursor-pointer transition-all ${
                        activeIndex === filteredResults.indexOf(result) ? 'bg-light-primary' : 'hover-bg-light'
                      }`}
                      onClick={() => handleResultClick(result)}
                    >
                      {renderResultItem(result, query)}
                    </div>
                  ))}
                </div>
              )}

              {/* Categorized Results */}
              {['Navigation', 'KPI', 'Company', 'Contact', 'Lead', 'Project', 'Employee', 'Task']
                .filter(type => filterType === 'All' || filterMap[filterType] === type)
                .map((type) => {
                  const typeResults = filteredResults.filter(r => r.type === type);
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
                        <span className="section-title fw-bold text-gray-700 fs-8 text-uppercase">{sectionLabels[type]}</span>
                        <span className="section-count badge badge-light-primary fs-9">{typeResults.length}</span>
                      </div>
                      {typeResults.slice(0, 10).map((result) => (
                        <div
                          key={result.id}
                          className={`search-result-item d-flex align-items-center px-4 py-3 cursor-pointer transition-all ${
                            activeIndex === filteredResults.indexOf(result) ? 'bg-light-primary' : 'hover-bg-light'
                          }`}
                          onClick={() => handleResultClick(result)}
                        >
                          {renderResultItem(result, query)}
                        </div>
                      ))}
                    </div>
                  );
                })}
              
              <div className="search-footer" onClick={() => navigate(`/search-results?q=${encodeURIComponent(query)}`)}>
                <span>Search for "{query}" across all fields</span>
                <KeyboardReturnIcon className="fs-4" />
              </div>
            </div>
          ) : query.length >= 2 && !isLoading && (
            <div className="search-empty-state py-10">
              <KTIcon iconName="search" className="fs-1 text-muted mb-2" />
              <p className="fw-bold text-gray-700">No results found for "{query}"</p>
              <span className="text-muted fs-7">Try refining your search or removing filters</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const renderResultItem = (result: UnifiedSearchResult, query: string) => {
  const matchingField = result.matches?.find((m: SearchMatchField) => m.isMatch);
  return (
    <>
      <div className="symbol symbol-35px me-3">
        <span className={`symbol-label bg-light-${getTypeColor(result.type)} shadow-sm`}>
          {result.type === 'Company' && <BusinessIcon className={`fs-5 text-${getTypeColor(result.type)}`} />}
          {result.type === 'Contact' && <PersonIcon className={`fs-5 text-${getTypeColor(result.type)}`} />}
          {result.type === 'Lead' && <AssignmentIcon className={`fs-5 text-${getTypeColor(result.type)}`} />}
          {result.type === 'Project' && <AccountTreeIcon className={`fs-5 text-${getTypeColor(result.type)}`} />}
          {result.type === 'Employee' && <PeopleIcon className={`fs-5 text-${getTypeColor(result.type)}`} />}
          {result.type === 'Task' && <CheckCircleIcon className={`fs-5 text-${getTypeColor(result.type)}`} />}
          {result.type === 'Navigation' && <ExploreIcon className={`fs-5 text-${getTypeColor(result.type)}`} />}
          {result.type === 'KPI' && <AssessmentIcon className={`fs-5 text-${getTypeColor(result.type)}`} />}
        </span>
      </div>
      <div className="d-flex flex-column flex-grow-1 overflow-hidden">
        <span className="fs-7 fw-bold text-gray-800 text-truncate">
          <HighlightMatch text={result.title} query={query} />
        </span>
        <div className="d-flex align-items-center gap-2 mt-1">
          {matchingField ? (
            <span className="fs-9 text-muted d-flex align-items-center">
              <span className="fw-bold me-1 text-gray-500">{matchingField.label}:</span>
              <HighlightMatch text={matchingField.value} query={query} />
            </span>
          ) : (
            <span className="fs-9 text-muted text-truncate">{result.subtitle}</span>
          )}
        </div>
      </div>
      {(result as any).score > 100 && (
        <span className="badge badge-light-success fs-10 py-0 px-2 ms-2 rounded-pill">High Match</span>
      )}
    </>
  );
};

const getTypeColor = (type: string) => {
  switch (type) {
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

