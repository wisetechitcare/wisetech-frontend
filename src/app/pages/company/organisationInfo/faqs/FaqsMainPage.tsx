import React, { useState, useRef, useEffect } from 'react';
import { FAQItem, FAQItemEdit, FAQSectionCard, AddFAQModal } from './components';
import { FAQSection, FAQ, FAQType } from './types';
import { faqsIcons } from '@metronic/assets/sidepanelicons';
import { fetchAllFaqs, createNewFaq, updateFaqById, deleteFaqById, fetchCompanyOverview } from '@services/company';
import { toast } from 'react-toastify';
import { deleteConfirmation, errorConfirmation, successConfirmation } from '@utils/modal';
import { miscellaneousIcons } from '@metronic/assets/miscellaneousicons';

const FaqsMainPage = ({hideEditButton}: {hideEditButton?: boolean}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [faqSections, setFaqSections] = useState<FAQSection[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('attendance');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentSectionId, setCurrentSectionId] = useState<string>('');
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>('');
  const [isScrolling, setIsScrolling] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Create refs for each section
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const contentAreaRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect mobile/tablet screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 992); // Bootstrap lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch FAQs from API
  const fetchFAQs = async (compId: string) => {
    try {
      const response = await fetchAllFaqs(compId);
      console.log("response=======================>response", response);
      console.log('FAQs API Response:', response);

      if (response?.data?.sections && Array.isArray(response.data.sections)) {
        const transformedSections = response.data.sections.map((section: any) => ({
          id: section.id,
          title: section.title,
          faqs: section.faqs.map((faq: any) => ({
            ...faq,
            isExpanded: false
          }))
        }));

        // Ensure general_rules section always exists
        if (!transformedSections.find((s: FAQSection) => s.id === 'general_rules')) {
          transformedSections.push({ id: 'general_rules', title: 'General Rules', faqs: [] });
        }

        console.log('Transformed FAQ Sections ================>:', transformedSections);
        setFaqSections(transformedSections);
      } else {
        const defaultSections: FAQSection[] = [
          { id: 'attendance', title: 'Attendance', faqs: [] },
          { id: 'leaves', title: 'Leaves', faqs: [] },
          { id: 'salary', title: 'Salary', faqs: [] },
          { id: 'reimbursement', title: 'Reimbursement', faqs: [] },
          { id: 'general_rules', title: 'General Rules', faqs: [] },
        ];
        setFaqSections(defaultSections);
        console.log('No FAQs found, using default empty sections');
      }
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      toast.error('Failed to load FAQs');
      const defaultSections: FAQSection[] = [
        { id: 'attendance', title: 'Attendance', faqs: [] },
        { id: 'leaves', title: 'Leaves', faqs: [] },
        { id: 'salary', title: 'Salary', faqs: [] },
        { id: 'reimbursement', title: 'Reimbursement', faqs: [] },
        { id: 'general_rules', title: 'General Rules', faqs: [] },
      ];
      setFaqSections(defaultSections);
    }
  };

  // Fetch company ID and FAQs on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { data: { companyOverview } } = await fetchCompanyOverview();
        const fetchedCompanyId = companyOverview[0]?.id;
        setCompanyId(fetchedCompanyId);

        if (fetchedCompanyId) {
          await fetchFAQs(fetchedCompanyId);
        }
      } catch (error) {
        console.error('Error in initial fetch:', error);
        toast.error('Failed to initialize FAQs');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Improved scroll spy with throttling
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking && !isScrolling) {
        window.requestAnimationFrame(() => {
          if (!contentAreaRef.current) {
            ticking = false;
            return;
          }

          const scrollPosition = contentAreaRef.current.scrollTop;
          const viewportHeight = contentAreaRef.current.clientHeight;
          const threshold = viewportHeight * 0.3;

          let activeSection = faqSections[0]?.id;
          let minDistance = Infinity;

          for (const section of faqSections) {
            const element = sectionRefs.current[section.id];
            if (element) {
              const rect = element.getBoundingClientRect();
              const containerRect = contentAreaRef.current!.getBoundingClientRect();
              const relativeTop = rect.top - containerRect.top;
              
              const distance = Math.abs(relativeTop - threshold);
              
              if (relativeTop <= threshold && distance < minDistance) {
                minDistance = distance;
                activeSection = section.id;
              }
            }
          }

          setSelectedCategory(activeSection);
          ticking = false;
        });
        ticking = true;
      }
    };

    const contentArea = contentAreaRef.current;
    if (contentArea) {
      contentArea.addEventListener('scroll', handleScroll, { passive: true });
      return () => contentArea.removeEventListener('scroll', handleScroll);
    }
  }, [faqSections, isScrolling]);

  const getIconForSection = (sectionId: string) => {
    switch (sectionId) {
      case 'attendance':
        return faqsIcons?.attendanceFaqsIcon?.default;
      case 'leaves':
        return faqsIcons?.leaveFaqsIcon?.default;
      case 'salary':
        return faqsIcons?.salaryFaqsIcon?.default;
      case 'reimbursement':
        return faqsIcons?.reimbursementsFaqsIcon?.default;
      case 'general_rules':
        return faqsIcons?.reimbursementsFaqsIcon?.default;
      default:
        return undefined;
    }
  };

  const handleToggleFAQ = (sectionId: string, faqId: string) => {
    setFaqSections((prevSections) =>
      prevSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              faqs: section.faqs.map((faq) =>
                faq.id === faqId ? { ...faq, isExpanded: !faq.isExpanded } : faq
              ),
            }
          : section
      )
    );
  };

  const handleAddNew = (sectionId: string) => {
    setCurrentSectionId(sectionId);
    setEditingFaq(null);
    setShowAddModal(true);
  };

  const handleEdit = (sectionId: string, faqId: string) => {
    const section = faqSections.find((s) => s.id === sectionId);
    const faq = section?.faqs.find((f) => f.id === faqId);
    if (faq) {
      setCurrentSectionId(sectionId);
      setEditingFaq(faq);
      setShowAddModal(true);
    }
  };

  const handleDelete = async (sectionId: string, faqId: string) => {
    try {
      const confirm = await deleteConfirmation('Successfully deleted FAQ.');
      if (!confirm){
        return;
      }
      await deleteFaqById(faqId);
      await fetchFAQs(companyId);
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      errorConfirmation('Failed to delete FAQ');
    }
  };

  const handleSaveFAQ = async (question: string, answer: string) => {
    try {
      if (editingFaq) {
        await updateFaqById(editingFaq.id, { question, answer });
        successConfirmation('FAQ updated successfully');
      } else {
        await createNewFaq({
          question,
          answer,
          type: currentSectionId as FAQType,
          companyId: companyId
        });
        successConfirmation('FAQ created successfully');
      }

      await fetchFAQs(companyId);
      setShowAddModal(false);
      setEditingFaq(null);
    } catch (error) {
      console.error('Error saving FAQ:', error);
      errorConfirmation('Failed to save FAQ');
    }
  };

  const scrollToSection = (sectionId: string) => {
    setIsScrolling(true);
    setSelectedCategory(sectionId);
    
    const element = sectionRefs.current[sectionId];
    if (element && contentAreaRef.current) {
      const containerRect = contentAreaRef.current.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const relativeTop = elementRect.top - containerRect.top;
      const scrollTop = contentAreaRef.current.scrollTop;
      const targetScroll = scrollTop + relativeTop - 20;

      contentAreaRef.current.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 1000);
    }
  };

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: '#f5f8fa',
          height: '73vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#f5f8fa',
        height: '73vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header - Fixed and Responsive */}
      <div 
        style={{
          // padding: isMobile ? '16px' : '0PX',
          backgroundColor: '#f5f8fa',
          // borderBottom: '1px solid #e4e6ef',
          flexShrink: 0,
        }}
      >
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2 gap-md-3 flex-grow-1">
            {isEditMode && (
              <div className="rounded-circle cursor-pointer"
                onClick={() => setIsEditMode(false)}
              >
                    <img src={miscellaneousIcons.leftArrow} alt="Back" />
              </div>
            )}
            <h1
              style={{
                fontSize: isMobile ? '18px' : '24px',
                fontWeight: 600,
                color: '#000',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: isMobile ? 'nowrap' : 'normal',
              }}
            >
              { isEditMode ? 'Edit FAQ Frequently Asked Questions' : "Frequently Asked Questions"}
            </h1>
          </div>
          {!isEditMode && !hideEditButton && (
            <button
              onClick={() => setIsEditMode(true)}
              style={{
                backgroundColor: '#9d4141',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: 500,
                padding: isMobile ? '8px 20px' : '10px 32px',
                cursor: 'pointer',
                height: isMobile ? '36px' : '40px',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(157, 65, 65, 0.1)',
                flexShrink: 0,
                marginLeft: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#8a3838';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(157, 65, 65, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#9d4141';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(157, 65, 65, 0.1)';
              }}
            >
              Edit
            </button>
          )}
        </div>


      </div>

      {/* Sidebar and Content - Scrollable */}
      <div 
        className="d-flex"
        style={{
          padding: isMobile ? '16px' : '24px 0px',
          paddingTop: isMobile ? '0px' : '30px',
          gap: isMobile ? '16px' : '24px',
          flexGrow: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Desktop Sidebar - Hidden on mobile */}
        {!isMobile && (
          <div
            className="d-none d-lg-flex flex-column gap-1"
            style={{
              width: '200px',
              flexShrink: 0,
              position: 'sticky',
              top: 0,
              alignSelf: 'flex-start',
            }}
          >
            {faqSections.map((section) => {
              const isActive = selectedCategory === section.id;
              return (
                <div
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    borderRadius: '8px',
                    // backgroundColor: isActive ? '#fff' : 'transparent',
                    // borderLeft: isActive ? '3px solid #9d4141' : '3px solid transparent',
                    // boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
                  }}
                  // onMouseEnter={(e) => {
                  //   if (!isActive) {
                  //     // e.currentTarget.style.backgroundColor = '#fff';
                  //     e.currentTarget.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.05)';
                  //   }
                  // }}
                  // onMouseLeave={(e) => {
                  //   if (!isActive) {
                  //     e.currentTarget.style.backgroundColor = 'transparent';
                  //     e.currentTarget.style.boxShadow = 'none';
                  //   }
                  // }}
                >
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#9d4141' : '#5e6278',
                      transition: 'color 0.2s',
                    }}
                  >
                    {section.title}
                  </span>
                  {section.faqs.length > 0 && (
                    <span
                      style={{
                        fontSize: '12px',
                        color: isActive ? '#9d4141' : '#a1a5b7',
                        marginLeft: '8px',
                        fontWeight: 500,
                      }}
                    >
                      {/* ({section.faqs.length}) */}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Content Area - Scrollable and Responsive */}
        <div
          ref={contentAreaRef}
          className="flex-grow-1"
          style={{
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: isMobile ? '0' : '8px',
            scrollBehavior: 'smooth',
          }}
        >
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: isMobile ? '16px' : '2px' 
          }}>
            {faqSections.map((section) => (
              <div
                key={section.id}
                ref={(el) => (sectionRefs.current[section.id] = el)}
                style={{
                  scrollMarginTop: '20px',
                }}
              >
                <FAQSectionCard
                  title={section.title}
                  showAddButton={isEditMode}
                  onAddNew={() => handleAddNew(section.id)}
                  icon={getIconForSection(section.id)}
                >
                  {section.faqs.length === 0 && !isEditMode ? (
                    <div
                      style={{
                        padding: isMobile ? '24px 16px' : '32px',
                        textAlign: 'center',
                        color: '#a1a5b7',
                        fontSize: isMobile ? '13px' : '14px',
                      }}
                    >
                      No FAQs available for this section
                    </div>
                  ) : isEditMode ? (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: isMobile ? '8px' : '12px' 
                    }}>
                      {section.faqs.map((faq) => (
                        <FAQItemEdit
                          key={faq.id}
                          faq={faq}
                          onEdit={() => handleEdit(section.id, faq.id)}
                          onDelete={() => handleDelete(section.id, faq.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="d-flex flex-column" style={{ gap: isMobile ? '12px' : '16px' }}>
                      {section.faqs.map((faq) => (
                        <FAQItem
                          key={faq.id}
                          faq={faq}
                          onToggle={() => handleToggleFAQ(section.id, faq.id)}
                        />
                      ))}
                    </div>
                  )}
                </FAQSectionCard>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay for mobile sidebar - REMOVED */}

      {/* Add/Edit FAQ Modal */}
      <AddFAQModal
        show={showAddModal}
        onHide={() => {
          setShowAddModal(false);
          setEditingFaq(null);
        }}
        onSave={handleSaveFAQ}
        editingFaq={editingFaq}
      />
    </div>
  );
};

export default FaqsMainPage;