import { useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { dataURLtoFile } from '@utils/file';

function SignatureInput({ setFile, imageUrl }: any) {
    const signatureCanvas = useRef<SignatureCanvas>(null);
    const [isPlaceholderVisible, setIsPlaceholderVisible] = useState(true);
    const [signatureUrl, setSignatureUrl] = useState(imageUrl);

    const clearSignature = () => {
        if (!signatureCanvas.current) return;
        signatureCanvas.current.clear();
    };

    const drawPlaceholderText = () => {
        if (!signatureCanvas.current) return;
        const canvas = signatureCanvas.current.getCanvas();
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '20px "Barlow"';
        ctx.fillStyle = '#CCCCCC';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        console.log(`Canvas Width: ${canvas.width}, Canvas Height: ${canvas.height}`);
        console.log(`Center X: ${centerX}, Center Y: ${centerY}`);
        ctx.fillText('Sign here', canvas.width / 4, canvas.height / 4);
    };

    const clearPlaceHolder = () => {
        if (!signatureCanvas.current) return;
        if (isPlaceholderVisible) {
            const canvas = signatureCanvas.current.getCanvas();
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setIsPlaceholderVisible(false);
    }

    const saveSignature = () => {
        if (!signatureCanvas.current) return;
        const trimmedCanvas = signatureCanvas.current.getTrimmedCanvas();
        const dataURL = trimmedCanvas.toDataURL('image/png');
        setSignatureUrl(dataURL);
        setFile("digitalSignature", dataURLtoFile(dataURL, "digitalSignature.png"));
    };

    useEffect(() => drawPlaceholderText(), []);

    useEffect(() => setSignatureUrl(imageUrl), [imageUrl]);

    return (
        <>
            <div className={`signature-container ${signatureUrl ? 'd-none' : ''}  `}>
                <div className='shadow-sm bg-white rounded p-3 mb-3'>
                    <SignatureCanvas
                        ref={signatureCanvas}
                        onBegin={clearPlaceHolder}
                        canvasProps={{ className: 'signature-canvas w-100' }}
                    />
                </div>
                <div className="row">
                    <div className="col-lg-12">
                        <div className='card-toolbar text-end'>
                            <button type="button" onClick={clearSignature} className='btn btn-sm btn-light-primary mx-4'>
                                Clear Signature
                            </button>
                            <button type="button" onClick={saveSignature} className='btn btn-sm btn-light-primary'>
                                Save Signature
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {signatureUrl && <img src={signatureUrl} className='w-200 h-50' />}
        </>
    );
}

export default SignatureInput;