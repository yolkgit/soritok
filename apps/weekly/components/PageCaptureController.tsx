import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';
import { Camera, MousePointerClick } from 'lucide-react'; 
import { PrintModal } from './PrintModal'; 

export const PageCaptureController = () => {
  const [isCaptureMode, setIsCaptureMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  
  const hoveredElementRef = useRef<HTMLElement | null>(null);

  const toggleCaptureMode = () => {
    setIsCaptureMode((prev) => !prev);
  };

  useEffect(() => {
    if (!isCaptureMode) {
      document.body.classList.remove('capture-mode');
      if (hoveredElementRef.current) hoveredElementRef.current.classList.remove('capture-highlight');
      return;
    }

    document.body.classList.add('capture-mode');

    const handleMouseOver = (e: MouseEvent) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      
      // Ignore the capture button itself and modal
      if (target.closest('.capture-control-btn') || target.closest('.print-modal')) return;

      if (hoveredElementRef.current === target) return;
      if (hoveredElementRef.current) hoveredElementRef.current.classList.remove('capture-highlight');
      
      target.classList.add('capture-highlight');
      hoveredElementRef.current = target;
    };

    const handleClick = async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      
      // Ignore click on the capture button
      if (target.closest('.capture-control-btn')) return;

      target.classList.remove('capture-highlight'); 
      document.body.classList.remove('capture-mode');
      
      setIsCaptureMode(false);
      setIsModalOpen(true);
      setIsPdfGenerating(true);

      try {
        // Wait for UI to settle
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(target, {
          scale: 2, 
          useCORS: true, 
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff', 
          
          onclone: (clonedDoc: Document) => {
            const clonedBody = clonedDoc.body;
            
            // 1. [Font Force] Detect Current Font from Body and Apply
            // This ensures captured partials match the user's selected font
            const computedStyle = window.getComputedStyle(document.body);
            const currentFont = computedStyle.fontFamily;
            
            clonedBody.style.fontFamily = currentFont;
            
            const allElements = clonedBody.querySelectorAll('*');
            allElements.forEach((el: any) => {
                if (!el.classList.contains('lucide')) {
                    el.style.fontFamily = currentFont;
                }
            });

            // 2. Force styling for the captured container
            const element = clonedBody.querySelector(`[class*="${target.className.split(' ')[0]}"]`) as HTMLElement || clonedBody;
            if(element) {
                element.style.backgroundColor = '#ffffff';
                element.style.padding = '20px'; 
            }

            // --- A. Schedule Grid Fixes (PREVENT CLIPPING & ALIGNMENT) ---
            
            // 3. Relax Row Height & Set Flex Layout
            const gridRows = clonedDoc.querySelectorAll('.pdf-row');
            gridRows.forEach((el: any) => {
                el.style.setProperty('gap', '0', 'important');
                el.style.setProperty('height', 'auto', 'important'); 
                el.style.setProperty('min-height', '36px', 'important'); 
                
                el.style.setProperty('display', 'flex', 'important');
                el.style.setProperty('flex-direction', 'row', 'important');
                el.style.setProperty('align-items', 'stretch', 'important');
            });

            // 4. [Style Reset] Fix Cells: STRICT Style Reset (Body + Header)
            const gridCells = clonedDoc.querySelectorAll('.pdf-cell, .pdf-header-cell');
            gridCells.forEach((el: any) => {
                el.style.setProperty('padding', '0', 'important');
                el.style.setProperty('margin', '0', 'important');
                el.style.setProperty('box-sizing', 'border-box', 'important');
                
                el.style.setProperty('display', 'flex', 'important');
                el.style.setProperty('justify-content', 'center', 'important');
                el.style.setProperty('align-items', 'center', 'important');
                
                if (el.classList.contains('pdf-cell')) {
                    el.style.setProperty('flex-direction', 'column', 'important');
                    el.style.setProperty('flex', '1 1 0%', 'important'); 
                    el.style.setProperty('width', '0', 'important'); 
                    el.style.setProperty('height', 'auto', 'important');
                    el.style.setProperty('min-height', '100%', 'important');
                    el.style.setProperty('font-size', '10px', 'important');
                }
                if (el.classList.contains('pdf-header-cell')) {
                    el.style.setProperty('height', '40px', 'important'); // Force fixed height for header
                }
            });
            
            // 5. Visual Correction: Nudge text UP using translateY
            const headerTexts = clonedDoc.querySelectorAll('.pdf-header-text');
            headerTexts.forEach((el: any) => {
                    el.style.setProperty('display', 'block', 'important');
                    el.style.setProperty('line-height', '1', 'important');
                    el.style.setProperty('transform', 'translateY(-10px)', 'important'); // Lift header text up by 3px
            });

            const cellTexts = clonedDoc.querySelectorAll('.pdf-cell-text');
            cellTexts.forEach((el: any) => {
                el.style.setProperty('line-height', '1.1', 'important');
                
                if (el.classList.contains('pdf-cell-text') || el.tagName === 'SPAN') {
                    el.style.setProperty('display', 'block', 'important');
                    el.style.setProperty('margin', '0', 'important');
                    el.style.setProperty('padding', '0', 'important');
                    el.style.setProperty('white-space', 'normal', 'important');
                    el.style.setProperty('overflow', 'visible', 'important');
                    el.style.setProperty('text-align', 'center', 'important');
                    el.style.setProperty('width', '100%', 'important');
                    el.style.setProperty('word-break', 'keep-all', 'important');
                    el.style.setProperty('transform', 'translateY(-10px)', 'important'); // Lift body text up by 2.5px
                }
            });

            // --- B. General Text Fixes ---
            const proseElements = clonedDoc.querySelectorAll('.prose, p, h1, h2, h3');
            proseElements.forEach((el: any) => {
                 if(el.closest('.pdf-cell')) return;
                 el.style.overflow = 'visible';
            });
          }
        });

        // User requirement: explicit image format 'image/png'
        const imgData = canvas.toDataURL('image/png');
        setPreviewUrl(imgData);

      } catch (err) {
        console.error('Capture failed:', err);
        alert('화면 캡처 중 오류가 발생했습니다.');
        setIsModalOpen(false);
      } finally {
        setIsPdfGenerating(false);
      }
    };

    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('click', handleClick, { capture: true });

    return () => {
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('click', handleClick, { capture: true });
      document.body.classList.remove('capture-mode');
      if (hoveredElementRef.current) hoveredElementRef.current.classList.remove('capture-highlight');
    };
  }, [isCaptureMode]);

  const handleDownloadPdf = () => {
    if (!previewUrl) return;
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210; 
      const pageHeight = 297; 
      
      const imgProps = pdf.getImageProperties(previewUrl);
      const imgHeight = (imgProps.height * pageWidth) / imgProps.width;

      if (imgHeight > pageHeight) {
         const longPdf = new jsPDF('p', 'mm', [210, Math.ceil(imgHeight)]); 
         longPdf.addImage(previewUrl, 'PNG', 0, 0, pageWidth, imgHeight);
         longPdf.save(`weekly_plan_${new Date().toISOString().slice(0,10)}.pdf`);
      } else {
         const yPos = (pageHeight - imgHeight) / 2 > 0 ? (pageHeight - imgHeight) / 2 : 0;
         pdf.addImage(previewUrl, 'PNG', 0, yPos, pageWidth, imgHeight);
         pdf.save(`weekly_plan_${new Date().toISOString().slice(0,10)}.pdf`);
      }
      
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      alert('PDF 저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 capture-control-btn no-print">
        <button 
            onClick={toggleCaptureMode} 
            className={`
                p-4 rounded-full shadow-xl transition-all flex items-center gap-2 font-bold
                ${isCaptureMode 
                    ? 'bg-rose-500 text-white hover:bg-rose-600 animate-pulse ring-4 ring-rose-200' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-110'}
            `}
            title={isCaptureMode ? "캡처 취소" : "화면 부분 캡처"}
        >
          {isCaptureMode ? <MousePointerClick /> : <Camera />}
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300">
            {isCaptureMode ? "영역 선택 중..." : ""}
          </span>
        </button>
        {isCaptureMode && (
            <div className="absolute bottom-16 right-0 bg-slate-800 text-white text-xs py-2 px-4 rounded-lg shadow-lg whitespace-nowrap mb-2">
                원하는 영역을 클릭하세요!
            </div>
        )}
      </div>
      
      <PrintModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setPreviewUrl(null); }}
        onDownloadPdf={handleDownloadPdf}
        previewUrl={previewUrl}
        isPdfGenerating={isPdfGenerating}
      />
    </>
  );
};