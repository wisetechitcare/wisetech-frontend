import React, { useEffect, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { Dialog, DialogContent } from '@mui/material';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { KTIcon } from '@metronic/helpers';

interface Position {
    x: number;
    y: number;
}
   
interface PdfPreviewerProps {
    signatureUrl: string;
    file: string;
    onClose: () => void;
}

const PdfPreviewer: React.FC<PdfPreviewerProps> = ({ signatureUrl, file, onClose }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageHeights, setPageHeights] = useState<number[]>([]);
    const [buttonPosition, setButtonPosition] = useState<Position>({ x: 0, y: 0 });
    const [showButton, setShowButton] = useState<boolean>(false);
    const [signatureLoaded, setSignatureLoaded] = useState(false);
    const [signaturePosition, setSignaturePosition] = useState<Position>({ x: 0, y: 0 });
    const [open, setOpen] = useState(false);

    const handlePageClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const position = { x, y };
        setButtonPosition(position);
        setSignaturePosition(position);
        setShowButton(true);
    };

    const handlePageRendered = (pageNumber: number, pageHeight: number) => {
        setPageHeights((prevHeights) => {
            const newHeights = [...prevHeights];
            newHeights[pageNumber - 1] = pageHeight;
            return newHeights;
        });
    };

    const handleImportSignature = async (): Promise<void> => {
        setSignatureLoaded(true);
    };

    const handleDragStop = (e: DraggableEvent, data: DraggableData): void => {
        const parentElement = (e.currentTarget as HTMLElement).parentElement;

        if (parentElement) {
            const parentRect = parentElement.getBoundingClientRect();
            const newX = data.x - parentRect.left;
            const newY = data.y - parentRect.top;
            setSignaturePosition({ x: newX, y: newY });
        }
    };

    const handleScroll = () => {
        if (containerRef.current && pageHeights.length > 0) {
            const { scrollTop } = containerRef.current;
            let cumulativeHeight = 0;

            for (let i = 0; i < pageHeights.length; i++) {
                cumulativeHeight += pageHeights[i];
                if (scrollTop < cumulativeHeight) {
                    setCurrentPage(i + 1);
                    break;
                }
            }
        }
    };

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    const handleCloseDialog = () => {
        setOpen(false);
        onClose();
        setButtonPosition({ x: 0, y: 0 });
        setSignaturePosition({ x: 0, y: 0 });
        setSignatureLoaded(false);
        setShowButton(false);
    };

    useEffect(() => {
        if (file) setOpen(true);
    }, [file]);

    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
        }
        return () => {
            if (container) {
                container.removeEventListener('scroll', handleScroll);
            }
        };
    }, [pageHeights]);

    return (
        <Dialog open={open} onClose={handleCloseDialog} fullWidth maxWidth="lg">
            <DialogContent>
                <button
                    style={{
                        position: 'absolute',
                        top: '0px',
                        right: '0px',
                        background: 'transparent',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        zIndex: 1001,
                        display: 'block',
                        marginBottom: '10px'
                    }}
                    onClick={handleCloseDialog}
                >
                    ✖️
                </button>
                <div className='notice d-flex bg-primary-red rounded border-warning border border-dashed p-6'>
                    <KTIcon iconName='information-5' className='fs-2tx text-white me-4' />
                    <div className='d-flex flex-stack flex-grow-1'>
                        <div className='fw-bold'>
                            <h4 className='text-white fw-bolder'>Click on the document to e-sign it</h4>
                            <div className='fs-6 text-white'>
                                If you haven't registered your e-sign then please go into My Profile - Edit Profile
                            </div>
                        </div>
                    </div>
                </div>
                <div onClick={handlePageClick} className='position-relative'>
                    <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
                        {Array.from(new Array(numPages), (_, index) => (
                            <Page
                                key={`page_${index + 1}`}
                                pageNumber={index + 1}
                                scale={1.5}
                                onLoadSuccess={({ height }) => handlePageRendered(index + 1, height)}
                                className="d-flex justify-content-center"
                            />
                        ))}

                        {showButton && !signatureLoaded && (
                            <button
                                style={{
                                    position: 'absolute',
                                    top: buttonPosition.y,
                                    left: buttonPosition.x,
                                    zIndex: 1000
                                }}
                                onClick={handleImportSignature}
                                className='btn btn-primary'
                            >
                                Import Signature
                            </button>
                        )}

                        {signatureUrl && signatureLoaded && (
                            <Draggable bounds="parent"
                                onStart={(e) => e.preventDefault()}
                                onStop={handleDragStop}>
                                <img
                                    src={signatureUrl}
                                    alt="Signature"
                                    style={{
                                        position: 'absolute',
                                        top: `${signaturePosition.y}px`,
                                        left: `${signaturePosition.x}px`,
                                        zIndex: 999,
                                        width: '100px',
                                        cursor: 'move'
                                    }}
                                />
                            </Draggable>
                        )}
                    </Document>
                </div>
            </DialogContent>
        </Dialog>

    );
};

export default PdfPreviewer;
