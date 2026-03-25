import { Dialog, DialogContent } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import { DraggableEventHandler } from "react-draggable";
import { Document, Page, pdfjs } from "react-pdf";

interface Coordinates {
    x: number;
    y: number;
    page?: number | null;
}

interface PdfLoaderProps {
    signatureUrl: string;
    file: string;
    fileName: string;
    onClose: () => void;
}

const styles: { [key: string]: React.CSSProperties } = {
    closeButton: {
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
    },
};

function PdfLoader({ signatureUrl, file, onClose, fileName }: PdfLoaderProps) {
    const [open, setOpen] = useState<boolean>(false);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [coordinates, setCoordinates] = useState<Coordinates>({ x: 0, y: 0 });
    const [showButton, setShowButton] = useState<boolean>(false);
    const [signatureLoaded, setSignatureLoaded] = useState<boolean>(false);
    const [pageHeights, setPageHeights] = useState<number[]>([]);
    const pageRefs = useRef<Array<React.RefObject<HTMLDivElement>>>([]);
    // const [signatureCoordinates, setSignatureCoordinates] = useState({ x: 0, y: 0 });

    const handleCloseDialog = () => {
        onClose();
        setOpen(false);
        setShowButton(false);
        setSignatureLoaded(false);
        setCoordinates({ x: 0, y: 0 });
    };

    const documentLoaded = ({ numPages }: { numPages: number }) => {
        setTotalPages(numPages);
        pageRefs.current = new Array(numPages).fill(null).map((_, i) => pageRefs.current[i] || React.createRef());
        setPageHeights(Array(numPages).fill(0));
    };

    const pageLoaded = (pageNumber: number, page: pdfjs.PDFPageProxy) => {
        const viewport = page.getViewport({ scale: 1.5 });
        setPageHeights(prevHeights => {
            const newHeights = [...prevHeights];
            newHeights[pageNumber - 1] = viewport.height;
            return newHeights;
        });
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, pageNumber: number) => {
        const cumulativeHeight = pageHeights.slice(0, pageNumber - 1).reduce((sum, height) => sum + height, 0);
        setCoordinates({
            x: e.nativeEvent.offsetX,
            y: e.nativeEvent.offsetY + cumulativeHeight,
            page: pageNumber
        });
        setShowButton(true);
    };

    const handleDrag: DraggableEventHandler = (e, data) => {
        setCoordinates(prev => ({
            x: prev.x + data.deltaX,
            y: prev.y + data.deltaY,
            page: prev.page
        }));
    };

    /*
    const handleDragStop = (e: any, data: any) => {
        const { x, y } = data;
        setSignatureCoordinates({ x: Math.abs(x), y: Math.abs(y) });
    };
    */

    const handleImportSignature = () => setSignatureLoaded(true);

    /*
    const saveDocument = async () => {
        const existingPdfBytes = await fetch(file).then(res => res.arrayBuffer());

        const pdfDoc = await PDFDocument.load(existingPdfBytes);

        const pngImageBytes = await fetch(signatureUrl).then(res => res.arrayBuffer());
        const pngImage = await pdfDoc.embedPng(pngImageBytes);
        const { width, height } = pngImage.scale(0.2);

        const { page: pgNumber } = coordinates;
        const page = pdfDoc.getPage((pgNumber || 1) - 1);
        const pageHeight = page.getHeight();

        const param = {
            x: signatureCoordinates.x,
            y: pageHeight - signatureCoordinates.y - height,
            width,
            height
        };

        page.drawImage(pngImage, param);

        const pdfBytes = await pdfDoc.save();
        console.log(pdfBytes);

        // Convert Uint8Array to Blob
        const blob = new Blob([pdfBytes]);

        const fileObj = new File([blob], fileName, {
            lastModified: new Date().getTime()
        });

        const formData = new FormData();
        formData.append("file", fileObj);

        const { data: { path }} = await uploadUserAsset(formData, userId);
        console.log(path);
    }
    */

    useEffect(() => {
        if (file) {
            setOpen(true);
            pageRefs.current = [];
        };
    }, [file]);

    return (
        <Dialog open={open} fullWidth maxWidth="lg">
            <DialogContent>
                <button style={styles.closeButton} onClick={handleCloseDialog}>✖️</button>

                {/* <NotificationBar msg="Click on the document to e-sign it"
                    detail="If you haven't registered your e-sign then please go into My Profile - Edit Profile" /> */}

                <div className="position-relative">
                    <Document file={file} onLoadSuccess={documentLoaded}>
                        {Array.from({ length: totalPages }, (v, index) => (
                            <div ref={pageRefs.current[index]} key={index} onClick={(e) => handleClick(e, index + 1)}>
                                <Page
                                    pageNumber={index + 1}
                                    onLoadSuccess={(page) => pageLoaded(index + 1, page)}
                                    scale={1.5}
                                    className="d-flex justify-content-center"
                                />
                            </div>
                        ))}

                        {/* {showButton && !signatureLoaded && (
                            <button
                                style={{
                                    position: 'absolute',
                                    top: `${coordinates.y}px`,
                                    left: `${coordinates.x}px`,
                                    zIndex: 999
                                }}
                                onClick={handleImportSignature}
                                className='btn btn-primary'
                            >
                                Import Signature
                            </button>
                        )} */}

                        {/* {signatureUrl && signatureLoaded && (
                            <Draggable bounds="parent"
                                // onStop={handleDragStop}
                                onDrag={handleDrag}>
                                <img
                                    src={signatureUrl}
                                    alt="Signature"
                                    style={{
                                        position: 'absolute',
                                        zIndex: 999,
                                        top: `${coordinates.y}px`,
                                        left: `${coordinates.x}px`,
                                        width: '100px',
                                        cursor: 'move'
                                    }}
                                />
                            </Draggable>
                        )} */}
                    </Document>

                    {/* <div className='d-flex justify-content-end'>
                        <button type='button' className='btn btn-lg btn-primary me-3' onClick={saveDocument}>
                            Save Document
                        </button>
                    </div> */}
                </div>

            </DialogContent>
        </Dialog>
    );

}

export default PdfLoader;