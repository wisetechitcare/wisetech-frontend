import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { KTIcon } from '@metronic/helpers';
import { HighlightMatch, performGlobalSearch, UnifiedSearchResult, SearchMatchField } from '@app/utils/search';

const SearchResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const q = queryParams.get('q') || '';
  const initialType = queryParams.get('type') || 'all';
  const [allResults, setAllResults] = useState<UnifiedSearchResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<UnifiedSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(initialType === 'all' ? 'All' : initialType);

  const query = q;

  useEffect(() => {
    if (!query) return;

    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const results = await performGlobalSearch(query);
        setAllResults(results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, [query]);

  useEffect(() => {
    if (activeTab === 'All') {
      setFilteredResults(allResults);
    } else {
      setFilteredResults(allResults.filter(r => r.type === activeTab));
    }
  }, [allResults, activeTab]);

  return (
    <div className="card shadow-sm">
      {isLoading ? (
        <div className="d-flex justify-content-center py-10">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-header border-0 pt-6">
            <div className="card-title flex-column">
              <h3 className="card-label fw-bold text-gray-800">Search Results</h3>
              <span className="text-muted mt-1 fw-semibold fs-7">
                Found {filteredResults.length} results for "{query}"
              </span>
            </div>
            <div className="card-toolbar">
              <div className="d-flex flex-wrap gap-2">
                {['All', 'Navigation', 'KPI', 'Company', 'Contact', 'Lead', 'Project', 'Employee', 'Task'].map((type) => (
                  <button
                    key={type}
                    className={`btn btn-sm ${activeTab === type ? 'btn-primary' : 'btn-light-primary'}`}
                    onClick={() => setActiveTab(type)}
                  >
                    {type === 'Navigation' ? 'Pages' : type === 'All' ? 'All' : type}s ({type === 'All' ? allResults.length : allResults.filter(r => r.type === type).length})
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card-body py-5">
            {filteredResults.length > 0 ? (
              <div className="row g-6">
                {filteredResults.map((result, idx) => (
                  <div key={`${result.type}-${result.id}-${idx}`} className="col-md-6 col-xl-4">
                    <div 
                      className="card h-100 border border-dashed border-gray-300 card-hover shadow-none"
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                      onClick={() => navigate(result.path)}
                    >
                      <div className="card-body p-6">
                        <div className="d-flex align-items-center mb-4">
                          <div className="symbol symbol-45px symbol-circle me-5">
                            <span className={`symbol-label bg-light-${getTypeColor(result.type)}`}>
                              <KTIcon iconName={result.icon} className={`fs-1 text-${getTypeColor(result.type)}`} />
                            </span>
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="text-gray-900 text-hover-primary fs-5 fw-bold mb-1">
                                <HighlightMatch text={result.title} query={query} />
                              </div>
                              <span className={`badge badge-light-${getTypeColor(result.type)} fw-bold fs-8 px-2 py-1`}>
                                {result.type}
                              </span>
                            </div>
                            <div className="text-muted fw-semibold fs-7">{result.subtitle}</div>
                          </div>
                        </div>

                        {/* Contextual Fields */}
                        <div className="separator separator-dashed my-4"></div>
                        
                        <div className="d-flex flex-column gap-2">
                          {result.matches?.map((match: SearchMatchField, mIdx: number) => (
                            <div key={mIdx} className={`d-flex align-items-center fs-7 ${match.isMatch ? 'bg-light-warning rounded px-2 py-1' : ''}`}>
                              <span className="text-gray-500 fw-bold w-80px">{match.label}:</span>
                              <span className="text-gray-800 flex-grow-1 text-truncate">
                                <HighlightMatch text={match.value} query={query} />
                              </span>
                              {match.isMatch && (
                                <span className="badge badge-warning fs-9 px-2 ms-2">Matched</span>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="mt-5 d-flex justify-content-end">
                          <div className="btn btn-sm btn-light-primary fw-bold">View Profile</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <KTIcon iconName="search" className="fs-3x text-muted mb-5" />
                <h4 className="fw-bold">No results found</h4>
                <p className="text-muted">Try adjusting your search or filters to find what you're looking for.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .card-hover:hover {
          border-color: var(--bs-primary) !important;
          background-color: var(--bs-light-primary) !important;
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
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

export default SearchResultsPage;
