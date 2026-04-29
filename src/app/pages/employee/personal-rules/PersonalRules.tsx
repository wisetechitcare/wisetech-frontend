import React, { useEffect, useState, useRef } from 'react';
import { Row, Col } from 'react-bootstrap';
import AttendanceSection from './components/AttendanceSection';
import LeavesSection from './components/LeavesSection';

const PersonalRules: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('attendance');
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Scroll spy effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200; // offset for better UX

      const sections = ['attendance', 'leaves'];

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const element = sectionRefs.current[section];

        if (element) {
          const elementTop = element.getBoundingClientRect().top + window.scrollY;
          if (elementTop <= scrollPosition) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      const elementTop = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementTop - 100,
        behavior: 'smooth'
      });
    }
  };

  const SidebarLink: React.FC<{ section: string; label: string }> = ({ section, label }) => {
    const isActive = activeSection === section;

    const handleClick = () => {
      scrollToSection(section);
      setShowSidebar(false); // Close mobile menu
    };

    return (
      <div
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '7px 8px',
          height: '24px',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          fontSize: '14px',
          color: isActive ? '#9d4141' : '#000',
          margin: 0,
          whiteSpace: 'pre'
        }}>
          {label}
        </p>
      </div>
    );
  };

  return (
    <div style={{
      backgroundColor: '#f7f9fc',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      alignItems: 'flex-end',
      minHeight: '100vh',
      height: 'auto'
    }}>
      {/* Page Title */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%'
      }}>
        <div style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center'
        }}>
          <p style={{
            fontFamily: 'Barlow, sans-serif',
            fontWeight: 600,
            fontSize: '24px',
            letterSpacing: '0.24px',
            color: '#000',
            margin: 0
          }}>
            Rules
          </p>
        </div>
      </div>

      {/* Mobile Menu Toggle */}
      <div className="d-lg-none mb-3 w-100">
        <button
          className="btn btn-sm btn-primary"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          <i className="ki-duotone ki-burger-menu fs-2"></i> Menu
        </button>
      </div>

      {/* Main Content Area */}
      <Row className="g-3 w-100">
        {/* Sidebar Navigation - Desktop */}
        <Col lg={2} className="d-none d-lg-block" style={{ flexShrink: 0 }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            alignItems: 'flex-start'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              alignItems: 'flex-start'
            }}>
              <SidebarLink section="attendance" label="Attendance" />
              <SidebarLink section="leaves" label="Leaves" />
            </div>
          </div>
        </Col>

        {/* Mobile Sidebar Overlay */}
        {showSidebar && (
          <div
            className="d-lg-none position-fixed top-0 start-0 w-100 h-100"
            style={{
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 1050
            }}
            onClick={() => setShowSidebar(false)}
          >
            <div
              className="bg-white p-4"
              style={{
                width: '250px',
                height: '100%',
                boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="mb-0">Menu</h5>
                <button
                  className="btn btn-sm btn-icon btn-light"
                  onClick={() => setShowSidebar(false)}
                >
                  <i className="ki-duotone ki-cross fs-2"></i>
                </button>
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <SidebarLink section="attendance" label="Attendance" />
                <SidebarLink section="leaves" label="Leaves" />
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <Col lg={10} xs={12}>
          <div
            ref={contentRef}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              alignItems: 'flex-start',
              width: '100%'
            }}
          >
            {/* Attendance Section */}
            <AttendanceSection sectionRef={(el) => (sectionRefs.current['attendance'] = el)} />

            {/* Leaves Section */}
            <LeavesSection sectionRef={(el) => (sectionRefs.current['leaves'] = el)} />
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default PersonalRules;
