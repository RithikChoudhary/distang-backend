import PDFDocument from 'pdfkit';
import { ICouple } from '../models/Couple.model';
import { IUser } from '../models/User.model';

/**
 * Certificate data interface
 */
export interface CertificateData {
  couple: ICouple;
  partner1: IUser;
  partner2: IUser;
}

/**
 * Generate a Digital Relationship Certificate PDF
 * This is an in-app certificate and NOT a legal document
 */
export const generateCertificatePDF = (data: CertificateData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });
      
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      const { couple, partner1, partner2 } = data;
      const pairingDate = couple.pairingDate
        ? new Date(couple.pairingDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'N/A';
      
      // Header
      doc
        .font('Helvetica-Bold')
        .fontSize(28)
        .fillColor('#4A154B')
        .text('Digital Relationship Certificate', { align: 'center' });
      
      doc.moveDown(0.5);
      
      // Decorative line
      doc
        .strokeColor('#E8B4BC')
        .lineWidth(2)
        .moveTo(100, doc.y)
        .lineTo(500, doc.y)
        .stroke();
      
      doc.moveDown(2);
      
      // Certificate body
      doc
        .font('Helvetica')
        .fontSize(14)
        .fillColor('#333333')
        .text('This is to certify that', { align: 'center' });
      
      doc.moveDown(1);
      
      // Partner names
      doc
        .font('Helvetica-Bold')
        .fontSize(24)
        .fillColor('#4A154B')
        .text(partner1.name, { align: 'center' });
      
      doc.moveDown(0.5);
      
      doc
        .font('Helvetica')
        .fontSize(16)
        .fillColor('#666666')
        .text('&', { align: 'center' });
      
      doc.moveDown(0.5);
      
      doc
        .font('Helvetica-Bold')
        .fontSize(24)
        .fillColor('#4A154B')
        .text(partner2.name, { align: 'center' });
      
      doc.moveDown(1.5);
      
      // Connection statement
      doc
        .font('Helvetica')
        .fontSize(14)
        .fillColor('#333333')
        .text('have officially connected their hearts in this app', { align: 'center' });
      
      doc.moveDown(2);
      
      // Details box
      const boxY = doc.y;
      doc
        .rect(100, boxY, 400, 120)
        .strokeColor('#E8B4BC')
        .lineWidth(1)
        .stroke();
      
      doc.moveDown(1);
      
      // Couple ID
      doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor('#666666')
        .text('Couple ID:', 120, boxY + 20);
      
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor('#4A154B')
        .text(couple.coupleId, 250, boxY + 18);
      
      // Date of Pairing
      doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor('#666666')
        .text('Date of Pairing:', 120, boxY + 50);
      
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor('#4A154B')
        .text(pairingDate, 250, boxY + 48);
      
      // Partner IDs
      doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor('#666666')
        .text('Partner IDs:', 120, boxY + 80);
      
      doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor('#333333')
        .text(`${partner1.uniqueId} & ${partner2.uniqueId}`, 250, boxY + 80);
      
      doc.y = boxY + 140;
      doc.moveDown(3);
      
      // Decorative hearts
      doc
        .font('Helvetica')
        .fontSize(24)
        .fillColor('#E8B4BC')
        .text('♥ ♥ ♥', { align: 'center' });
      
      doc.moveDown(3);
      
      // Disclaimer - Important!
      doc
        .rect(80, doc.y, 440, 60)
        .fillColor('#FFF3CD')
        .fill();
      
      const disclaimerY = doc.y + 10;
      
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#856404')
        .text('IMPORTANT DISCLAIMER', 100, disclaimerY, { align: 'center' });
      
      doc.moveDown(0.3);
      
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#856404')
        .text(
          'This is a digital certificate for personal use within this application only. ' +
          'This document is NOT a legal document and has no legal standing. ' +
          'It does not constitute a marriage certificate, civil partnership, or any legally binding agreement.',
          100,
          disclaimerY + 15,
          { width: 400, align: 'center' }
        );
      
      // Footer
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#999999')
        .text(
          `Generated on ${new Date().toLocaleDateString()}`,
          50,
          750,
          { align: 'center' }
        );
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

