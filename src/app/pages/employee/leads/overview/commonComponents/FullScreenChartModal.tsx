import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { ResponsiveContainer } from "recharts";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface FullScreenChartModalProps {
  show: boolean;
  onHide: () => void;
  title: string;
  children: React.ReactNode;
}

const FullScreenChartModal: React.FC<FullScreenChartModalProps> = ({
  show,
  onHide,
  title,
  children,
}) => {
  return (
    <Modal
      show={show}
      onHide={onHide}
      fullscreen
      aria-labelledby="full-screen-chart-title"
      centered
      className="p-0 overflow-hidden"
    >
      <Modal.Header closeButton className="border-0 shadow-sm sticky-top bg-white z-index-1 px-8 py-5">
        <Modal.Title id="full-screen-chart-title" className="fw-bold fs-2 text-dark d-flex align-items-center gap-3">
          <i className="bi bi-graph-up-arrow fs-2 text-primary"></i>
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0 bg-light d-flex flex-column align-items-center justify-content-center overflow-hidden h-100">
        <div className="w-100 h-100 position-relative p-8">
          <TransformWrapper
            initialScale={1}
            initialPositionX={0}
            initialPositionY={0}
            minScale={0.5}
            maxScale={4}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="position-absolute top-0 end-0 p-8 d-flex flex-column gap-3 z-index-2">
                  <Button 
                    variant="white" 
                    className="btn-icon btn-active-light-primary shadow-sm rounded-circle w-45px h-45px border-0" 
                    onClick={() => zoomIn()}
                  >
                    <i className="bi bi-plus-lg fs-3"></i>
                  </Button>
                  <Button 
                    variant="white" 
                    className="btn-icon btn-active-light-primary shadow-sm rounded-circle w-45px h-45px border-0" 
                    onClick={() => zoomOut()}
                  >
                    <i className="bi bi-dash-lg fs-3"></i>
                  </Button>
                  <Button 
                    variant="white" 
                    className="btn-icon btn-active-light-primary shadow-sm rounded-circle w-45px h-45px border-0" 
                    onClick={() => resetTransform()}
                  >
                    <i className="bi bi-arrow-counterclockwise fs-3"></i>
                  </Button>
                </div>
                
                <TransformComponent
                  wrapperStyle={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "20px",
                  }}
                  contentStyle={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div className="bg-white rounded-5 shadow-lg p-10 w-100 h-100 d-flex align-items-center justify-content-center" style={{ minWidth: 'min(90vw, 1200px)', minHeight: 'min(80vh, 800px)' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {children as React.ReactElement}
                    </ResponsiveContainer>
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default FullScreenChartModal;
