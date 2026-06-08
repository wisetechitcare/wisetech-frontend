import { useEffect, useState } from "react";
import { updateCompanyRating } from "@services/companies";
import { Button, Spinner, Modal } from "react-bootstrap";
import { KTIcon } from "@metronic/helpers";
import { getRatingByCompanyId } from "@services/projects";
import Loader from "@app/modules/common/utils/Loader";

const MAX_STARS = 10;

interface RatingFactor {
  id: string;
  name: string;
  rating: number;
  weight: string;
  color: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface CompanyRatingData {
  companyId: string;
  companyName: string;
  ratingFactors: RatingFactor[];
}

const CompaniesRating = ({ companyId, companyName, onRatingChange, toggleMounted }: { companyId: string, companyName?: string, onRatingChange?: (value: number) => void; toggleMounted?: boolean;}) => {
  const [ratingFactors, setRatingFactors] = useState<RatingFactor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingFactorId, setEditingFactorId] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<any | null>(null);
  
  // Modal state
  const [modalData, setModalData] = useState<{
    companyName: string;
    ratings: { [key: string]: number };
  }>({
    companyName: companyName || '',
    ratings: {}
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchRatingFactors = async () => {
    try {
      setLoading(true);
      const response = await getRatingByCompanyId(companyId);
      if (response?.data?.companyRating) {
        setRatingFactors(response.data.companyRating);
      }
    } catch (error) {
      console.error("Error fetching rating factors:", error);
      setError("Failed to fetch rating factors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatingFactors();
  }, [companyId, toggleMounted]);

  const renderStars = (count: number, color: string, isMobile: boolean = false) => {
    const starSize = isMobile ? 14 : 18;
    const filledStars = Array.from({ length: MAX_STARS }).map((_, idx) => (
      <span
        key={idx}
        style={{
          color: idx < count ? color : "#ccc",
          fontSize: starSize,
          marginRight: 1,
        }}
      >
        ★
      </span>
    ));
    return filledStars;
  };

  // Render interactive stars for modal
  const renderInteractiveStars = (factorId: string, currentRating: number, color: string) => {
    return Array.from({ length: MAX_STARS }).map((_, idx) => (
      <span
        key={idx}
        style={{
          color: idx < currentRating ? color : "#ccc",
          fontSize: 20,
          marginRight: 2,
          cursor: "pointer",
          transition: "color 0.2s ease"
        }}
        onClick={() => handleRatingChange(factorId, idx + 1)}
        onMouseEnter={(e) => {
          // Show preview on hover
          const stars = e.currentTarget.parentElement?.querySelectorAll('span');
          if (stars) {
            stars.forEach((star, starIdx) => {
              (star as HTMLElement).style.color = starIdx <= idx ? color : "#ccc";
            });
          }
        }}
        onMouseLeave={(e) => {
          // Reset to actual rating on mouse leave
          const stars = e.currentTarget.parentElement?.querySelectorAll('span');
          if (stars) {
            stars.forEach((star, starIdx) => {
              (star as HTMLElement).style.color = starIdx < currentRating ? color : "#ccc";
            });
          }
        }}
      >
        ★
      </span>
    ));
  };

  const handleRatingChange = (factorId: string, rating: number) => {
    setModalData(prev => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        [factorId]: rating
      }
    }));
  };

  const handleEditClick = async () => {
    try {
      setLoading(true);
      
      // Initialize modal data with current ratings
      const ratings: { [key: string]: number } = {};
      ratingFactors.forEach(factor => {
        ratings[factor.id] = factor.rating || 0;
      });

      setModalData({
        companyName: companyName || "", 
        ratings
      });
      
      setShowModal(true);
    } catch (error) {
      console.error("Error preparing edit modal:", error);
      setError("Failed to load rating data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      // Update each company rating
      const updatePromises = Object.entries(modalData.ratings).map(([factorId, rating]) => {
        return updateCompanyRating({
          companyId,
          factorId,
          rating
        });
      });

      await Promise.all(updatePromises);
      
      // Refresh the data
      await fetchRatingFactors();
      
      // Close modal
      setShowModal(false);
      
    } catch (error) {
      console.error("Error updating ratings:", error);
      setError("Failed to update ratings");
    } finally {
      setSubmitting(false);
    }
  };

  const totalWeightedRating = ratingFactors.reduce((total, factor) => {
    return total + (factor.rating || 0) * Number(factor.weight || 0);
  }, 0);

  const totalWeight = ratingFactors.reduce((total, factor) => {
    return total + Number(factor.weight || 0);
  }, 0);

  const weightedAverageRating = totalWeight > 0 ? totalWeightedRating / totalWeight : 0;

  // Calculate modal total
  const modalTotalWeightedRating = ratingFactors.reduce((total, factor) => {
    const rating = modalData.ratings[factor.id] || 0;
    return total + rating * Number(factor.weight || 0);
  }, 0);

  const modalWeightedAverageRating = totalWeight > 0 ? modalTotalWeightedRating / totalWeight : 0;

useEffect(() => {
  if (weightedAverageRating && onRatingChange) {
    onRatingChange(weightedAverageRating);
  }
}, [weightedAverageRating]);

  return (
    <>
      <div className="p-3 p-md-4 p-lg-5">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-3 mb-md-4">
          {/* <h4 
            className="mb-0"
            style={{ 
              fontFamily: "Barlow",
              fontWeight: "600",
              fontSize: "18px"
            }}
          >
            Rating Factors
          </h4> */}
        </div>
        
        <div className="d-flex justify-content-end align-items-center mb-4">
          <Button 
            variant="primary" 
            onClick={handleEditClick}
            disabled={loading || ratingFactors.length === 0}
          >
            Edit Rating
          </Button>
        </div>

        {/* Rating Card */}
        <div className="bg-white rounded-3 shadow-sm p-3 p-md-4">
          {/* Overall Rating Header */}
          <div className="d-flex justify-content-between align-items-center mb-4 mb-md-5">
            <div 
              className="fw-bold"
              style={{ 
                fontFamily: "Barlow", 
                fontSize: "19px"
              }}
            >
              Rating
            </div>
            <div className="d-flex align-items-center gap-2">
              <div style={{ color: "#FFD700", fontSize: "18px" }}>★</div>
              <span 
                className="fw-bold"
                style={{ 
                  fontFamily: "Barlow",
                  fontSize: "19px"
                }}
              >
                {weightedAverageRating.toFixed(1)}/{MAX_STARS}
              </span>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <Loader/>
          ) : error ? (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          ) : (
            /* Rating Factors List */
            <div className="rating-factors-list">
              {ratingFactors.map((factor, index) => (
                <div
                  key={factor.id}
                  className="rating-factor-item mb-3"
                >
                  {/* Mobile Layout */}
                  <div className="d-block d-md-none">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="fw-bold text-truncate" style={{ fontFamily: "Inter", fontSize: "14px", fontWeight: "500" }}>
                        {factor.name}
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span 
                          className="fw-bold"
                          style={{ 
                            fontSize: "14px",
                            minWidth: "20px"
                          }}
                        >
                          {factor.rating || 0}
                        </span>
                      </div>
                    </div>
                    <div className="d-flex align-items-center">
                      {renderStars(factor.rating || 0, factor.color, true)}
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="d-none d-md-flex justify-content-between align-items-center">
                    <div 
                      style={{ 
                        fontWeight:'500',
                        fontFamily:'Inter',
                        fontSize: "14px",
                        minWidth: "120px",
                        maxWidth: "200px"
                      }}
                    >
                      {factor.name}
                    </div>

                    <div className="d-flex align-items-center gap-3 flex-grow-1 justify-content-center">
                      <div className="d-flex align-items-center">
                        {renderStars(factor.rating || 0, factor.color)}
                      </div>
                      <div 
                        style={{ 
                          fontWeight:'500',
                          fontFamily:'Inter',
                          fontSize: "14px",
                          minWidth: "20px"
                        }}
                      >
                        {factor.rating || 0}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && ratingFactors.length === 0 && (
            <div className="text-center py-4 py-md-5">
              <div className="text-muted">
                <KTIcon iconName="star" className="fs-1 text-muted mb-3" />
                <p className="mb-0">No rating factors found</p>
              </div>
            </div>
          )}
        </div>

        {/* Custom Responsive Styles */}
        <style jsx>{`
          .rating-factor-item {
            transition: background-color 0.2s ease;
          }
          
          @media (max-width: 767px) {
            .rating-factors-list {
              gap: 8px;
            }
          }
          
          @media (min-width: 768px) {
            .rating-factors-list {
              gap: 12px;
            }
          }
          
          /* Ensure stars don't break on very small screens */
          @media (max-width: 320px) {
            .rating-factor-item span {
              font-size: 12px !important;
            }
          }
        `}</style>
      </div>

      {/* Edit Rating Modal */}
      <Modal 
        show={showModal} 
        onHide={() => setShowModal(false)}
        size="lg"
        centered
      >
        <div style={{ backgroundColor: '#f8f9fa', borderRadius: '12px' }}>
          <Modal.Header 
            closeButton 
            style={{ 
              backgroundColor: 'white',
              border: 'none',
              borderRadius: '12px 12px 0 0'
            }}
          >
            <Modal.Title style={{ fontFamily: 'Inter', fontWeight: '600', fontSize: '18px' }}>
              Rate Company "{modalData.companyName}"
            </Modal.Title>
          </Modal.Header>
          
          <Modal.Body style={{ backgroundColor: 'white', padding: '24px' }}>
            <div style={{ color: '#6c757d', fontSize: '14px', marginBottom: '20px' }}>
              <div className="row">
                <div className="col">Factors</div>
                <div className="col-auto">Your Rating</div>
              </div>
            </div>

            {ratingFactors.map((factor, index) => {
              const currentRating = modalData.ratings[factor.id] || 0;
              
              return (
                <div key={factor.id} className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div 
                      style={{ 
                        fontWeight: '500',
                        fontFamily: 'Inter',
                        fontSize: '14px'
                      }}
                    >
                      {factor.name}
                    </div>
                    <div 
                      style={{ 
                        fontWeight: '600',
                        fontSize: '16px',
                        minWidth: '20px',
                        textAlign: 'center'
                      }}
                    >
                      {currentRating}
                    </div>
                  </div>
                  
                  <div className="d-flex align-items-center">
                    {renderInteractiveStars(factor.id, currentRating, factor.color)}
                  </div>
                </div>
              );
            })}

            {/* Total Section */}
            <div 
              style={{ 
                borderTop: '1px solid #e9ecef',
                paddingTop: '16px',
                marginTop: '20px'
              }}
            >
              <div className="d-flex justify-content-between align-items-center">
                <div 
                  style={{ 
                    fontWeight: '600',
                    fontFamily: 'Inter',
                    fontSize: '14px'
                  }}
                >
                  Total
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span style={{ color: '#FFD700', fontSize: '19px' }}>★</span>
                  <span 
                    style={{ 
                      fontWeight: '600',
                      fontSize: '19px',
                      // color: '#FFD700',
                      fontFamily: 'Barlow',
                    }}
                  >
                    {modalWeightedAverageRating.toFixed(1)}/{MAX_STARS}
                  </span>
                </div>
              </div>
            </div>
          </Modal.Body>
          
          <Modal.Footer 
            style={{ 
              backgroundColor: 'white',
              border: 'none',
              borderRadius: '0 0 12px 12px',
              paddingTop: '0'
            }}
          >
            <Button 
              variant="primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    style={{ marginRight: '8px' }}
                  />
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    </>
  );
};

export default CompaniesRating;