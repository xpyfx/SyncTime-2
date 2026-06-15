import { Stay } from '../types';
import { parseCoordinateForCountry } from '../components/TravelGlobe';
import { jsPDF } from 'jspdf';

// Generate country ISO code matching
function getCountryCode(countryName: string): string {
  const mapping: Record<string, string> = {
    'Taiwan': 'TW', '台灣': 'TW',
    'Japan': 'JP', '日本': 'JP',
    'South Korea': 'KR', '韓國': 'KR',
    'Czechia': 'CZ', '捷克': 'CZ',
    'Austria': 'AT', '奧地利': 'AT',
    'Germany': 'DE', '德國': 'DE',
    'France': 'FR', '法國': 'FR',
    'United Kingdom': 'GB', '英國': 'GB',
    'United States': 'US', '美國': 'US',
    'Thailand': 'TH', '泰國': 'TH',
    'Vietnam': 'VN', '越南': 'VN',
    'Malta': 'MT', '馬爾他': 'MT',
    'Poland': 'PL', '波蘭': 'PL',
    'Norway': 'NO', '挪威': 'NO'
  };
  return mapping[countryName] || countryName.substring(0, 3).toUpperCase();
}

function calculateDays(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
  const diffTime = Math.abs(e.getTime() - s.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// FORMAT STAY DATE
function formatStayDate(dateStr: string) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
}

// RENDER RETRO "TRAJECTORY POSTCARD" (用於軌跡足跡)
export function drawStaysPoster(canvas: HTMLCanvasElement, stays: Stay[], userEmail: string = 'Traveller'): Promise<void> {
  return new Promise((resolve) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return resolve();

    // Scale canvas for ultra high resolution (DPI)
    canvas.width = 800;
    canvas.height = 1200;

    // 1. Draw Paper Texture Background
    ctx.fillStyle = '#FAF7F0';
    ctx.fillRect(0, 0, 800, 1200);

    // Subtle Grid background watermark
    ctx.strokeStyle = '#EAE4D9';
    ctx.lineWidth = 1;
    for (let i = 40; i < 800; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 1200);
      ctx.stroke();
    }
    for (let j = 40; j < 1200; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(800, j);
      ctx.stroke();
    }

    // Outer vintage double borders
    ctx.strokeStyle = '#4A4238';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 760, 1160);
    ctx.strokeStyle = '#8C8070';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(26, 26, 748, 1148);

    // Side Margin Coordinate Ruler Text
    ctx.save();
    ctx.translate(12, 600);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#8C8070';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('• LATITUDE & LONGITUDE PROJECTOR REGISTRATION • METADATA GRID AUTHENTICATED •', 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(788, 600);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#8C8070';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('• DESIGNED BY SMART PASS-TRAVEL RECORD STATION • DIGITAL POSTER •', 0, 0);
    ctx.restore();

    // 2. HEADER BRANDING SECTION
    ctx.fillStyle = '#1D1D1D';
    ctx.font = 'black 36px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WORLD TRAJECTORY', 400, 75);

    ctx.font = 'italic 12px "Times New Roman", serif';
    ctx.fillStyle = '#6E6252';
    ctx.fillText('“Not all those who wander are lost” • 漫空旅人軌跡檔案', 400, 100);

    // Elegant Divider line
    ctx.strokeStyle = '#4A4238';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(60, 115);
    ctx.lineTo(740, 115);
    ctx.stroke();

    // Metadata boxes below divider
    ctx.fillStyle = '#5A5245';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`TRAVELLER: ${userEmail}`, 60, 132);
    ctx.fillText(`LOG DATE: ${new Date().toISOString().substring(0, 10)}`, 60, 146);

    ctx.textAlign = 'right';
    ctx.fillText(`TOTAL COUNTRIES: ${new Set(stays.map(s => s.country)).size}`, 740, 132);
    ctx.fillText(`TOTAL STAYS: ${stays.length} RECORDS`, 740, 146);

    // Mini divider
    ctx.strokeStyle = '#8C8070';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(60, 155);
    ctx.lineTo(740, 155);
    ctx.stroke();

    // 3. MID CONTAINER: THE TRAVEL TRANSIT MAP
    ctx.strokeStyle = '#E2DDD3';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(400, 420, 140, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(400, 420, 220, 0, Math.PI * 2);
    ctx.stroke();

    // Plot coordinates
    const chronStays = [...stays].sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    const pts = chronStays.map(s => {
      const coords = parseCoordinateForCountry(s.country, s.city);
      return { ...s, lat: coords.lat, lng: coords.lng };
    });

    let minLat = 20, maxLat = 50, minLng = 10, maxLng = 140;
    if (pts.length > 0) {
      const lats = pts.map(p => p.lat);
      const lngs = pts.map(p => p.lng);
      minLat = Math.min(...lats);
      maxLat = Math.max(...lats);
      minLng = Math.min(...lngs);
      maxLng = Math.max(...lngs);
      
      const latDiff = maxLat - minLat || 10;
      const lngDiff = maxLng - minLng || 20;
      minLat -= latDiff * 0.18;
      maxLat += latDiff * 0.18;
      minLng -= lngDiff * 0.18;
      maxLng += lngDiff * 0.18;
    }

    const mappedPts = pts.map(p => {
      const x = 120 + ((p.lng - minLng) / (maxLng - minLng || 1)) * 560;
      const y = 240 + (1 - (p.lat - minLat) / (maxLat - minLat || 1)) * 320;
      return { ...p, x, y };
    });

    // Draw connecting flight trajectory paths
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 8]);
    ctx.beginPath();
    mappedPts.forEach((p, index) => {
      if (index === 0) ctx.moveTo(p.x, p.y);
      else {
        // Draw curved beautiful Bezier-like trajectory arc instead of straight lines
        const prev = mappedPts[index - 1];
        const cx = (prev.x + p.x) / 2;
        const cy = (prev.y + p.y) / 2 - Math.abs(prev.x - p.x) * 0.15;
        ctx.quadraticCurveTo(cx, cy, p.x, p.y);
      }
    });
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // Draw Nodes (cities) on the map
    mappedPts.forEach((p, idx) => {
      // Glow circle outer ring
      ctx.fillStyle = 'rgba(37, 99, 235, 0.13)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
      ctx.fill();

      // Core dot
      ctx.fillStyle = '#2563EB';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Node Index label
      ctx.fillStyle = '#1D1D1D';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${idx + 1}`, p.x + 8, p.y + 11);

      // Node Name label
      ctx.fillStyle = '#3A3228';
      ctx.font = 'bold 9px "Space Grotesk", sans-serif';
      ctx.fillText(`${p.country}·${p.city}`, p.x + 8, p.y - 6);
    });

    // Travel Map Box Header
    ctx.fillStyle = 'white';
    ctx.fillRect(320, 180, 160, 24);
    ctx.strokeStyle = '#4A4238';
    ctx.lineWidth = 1;
    ctx.strokeRect(320, 180, 160, 24);
    ctx.fillStyle = '#4A4238';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TRAVEL TRAJECTORY MAP', 400, 195);

    // 4. LOWER CARD SECTION: STAYS MEMORABLE POLAROID LOGS (Show up to bottom 5 entries)
    ctx.fillStyle = '#4A4238';
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('◆ RECENT EXPEDITION LOGS', 60, 620);

    ctx.strokeStyle = '#8C8070';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(60, 630);
    ctx.lineTo(740, 630);
    ctx.stroke();

    const recentStays = stays.slice(0, 5);
    let startY = 650;

    recentStays.forEach((stay, idx) => {
      // Background row board
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(60, startY, 680, 80);
      ctx.strokeStyle = '#E6E1D7';
      ctx.lineWidth = 1;
      ctx.strokeRect(60, startY, 680, 80);

      // Red or blue ink circular custom stamp on the right side of the stay
      ctx.save();
      ctx.translate(680, startY + 40);
      ctx.rotate((idx % 2 === 0 ? 12 : -8) * Math.PI / 180);
      ctx.strokeStyle = idx % 2 === 0 ? 'rgba(239, 68, 68, 0.45)' : 'rgba(37, 99, 235, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = 'bold 7px monospace';
      ctx.fillStyle = idx % 2 === 0 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(37, 99, 235, 0.45)';
      ctx.textAlign = 'center';
      ctx.fillText('DEPARTED', 0, -4);
      ctx.font = 'bold 7px monospace';
      ctx.fillText(formatStayDate(stay.startDate), 0, 6);
      ctx.restore();

      // Text information
      // Flag box
      const cc = getCountryCode(stay.country);
      ctx.fillStyle = '#2563EB';
      ctx.fillRect(80, startY + 20, 48, 40);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(cc, 104, startY + 45);

      // Details
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1D1D1D';
      ctx.font = 'bold 16px "Space Grotesk", sans-serif';
      ctx.fillText(`${stay.country} • ${stay.city}`, 144, startY + 38);

      ctx.fillStyle = '#8C8070';
      ctx.font = '11px monospace';
      ctx.fillText(`Duration: ${calculateDays(stay.startDate, stay.endDate)} days (${stay.startDate} to ${stay.endDate})`, 144, startY + 54);

      if (stay.remark) {
        ctx.fillStyle = '#FF5C8A';
        ctx.font = '10px "Space Grotesk", sans-serif';
        ctx.fillText(`“${stay.remark}”`, 144, startY + 70);
      }

      startY += 92;
    });

    // 5. SIGNATURE FOOTER & BARCODE
    const footerY = 1120;
    // Draw horizontal stylized barcode lines
    ctx.fillStyle = '#1D1D1D';
    let codeX = 60;
    const barWidths = [2, 5, 2, 7, 10, 3, 2, 8, 4, 11, 2, 6, 2, 8, 3, 9, 2, 4, 10, 5, 2];
    barWidths.forEach(w => {
      ctx.fillRect(codeX, footerY, w, 32);
      codeX += w + 2;
    });

    ctx.fillStyle = '#8C8070';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SA-TS 5292C131851F 4A86A73D EE1E405F202A', 60, footerY + 43);

    // Dynamic certificate emblem seal
    ctx.strokeStyle = '#4A4238';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(710, footerY + 15, 25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PASSPORT', 710, footerY + 13);
    ctx.fillText('VERIFIED', 710, footerY + 22);

    resolve();
  });
}

// RENDER GLOWING "COSMIC INSIGHTS poster" (用於軌跡分析)
export function drawInsightsPoster(canvas: HTMLCanvasElement, stays: Stay[], stats: any, currentYear: string = 'All'): Promise<void> {
  return new Promise((resolve) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return resolve();

    // Scale canvas
    canvas.width = 800;
    canvas.height = 1200;

    // 1. Dark Techno/Cosmic background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1200);
    bgGrad.addColorStop(0, '#090A10');
    bgGrad.addColorStop(0.5, '#0E111F');
    bgGrad.addColorStop(1, '#05060A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 800, 1200);

    // Glowing circle in background
    const radialGrad = ctx.createRadialGradient(400, 450, 50, 400, 450, 450);
    radialGrad.addColorStop(0, 'rgba(59, 130, 246, 0.1)');
    radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, 800, 1200);

    // Tech Grid Layout overlays
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 50; i < 800; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 1200);
      ctx.stroke();
    }
    for (let j = 50; j < 1200; j += 50) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(800, j);
      ctx.stroke();
    }

    // Border lines
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(25, 25, 750, 1150);

    // Corner tech crosshairs
    const drawCross = (cx: number, cy: number) => {
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy); ctx.lineTo(cx + 15, cy);
      ctx.moveTo(cx, cy - 15); ctx.lineTo(cx, cy + 15);
      ctx.stroke();
    };
    drawCross(25, 25);
    drawCross(775, 25);
    drawCross(25, 1175);
    drawCross(775, 1175);

    // 2. HEADER
    ctx.fillStyle = '#8B5CF6';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GLOBAL METRICS DATA VISUALIZATION', 400, 75);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'black 38px "Space Grotesk", sans-serif';
    ctx.fillText('TRAJECTORY ANALYTICS', 400, 115);

    // Underline
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 135);
    ctx.lineTo(700, 135);
    ctx.stroke();

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '11px monospace';
    ctx.fillText(`CLASSIFIED PASSPORT RECORD STATION • STATISTICAL SCOPE: ${currentYear === 'All' ? '全部紀錄 (All)' : `${currentYear} 年度`}`, 400, 155);

    // 3. STATISTICAL BENTO BOX GRID (4 Big Cards)
    // Card 1: Countries
    const drawCard = (cx: number, cy: number, cw: number, ch: number, label: string, num: string, color: string, sub: string) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(cx, cy, cw, ch);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, cy, cw, ch);

      // Glowing accent line
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 50, cy);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#9CA3AF';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(label.toUpperCase(), cx + 20, cy + 30);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 44px "Space Grotesk", sans-serif';
      ctx.fillText(num, cx + 20, cy + 85);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '10px monospace';
      ctx.fillText(sub, cx + 20, cy + 115);
    };

    drawCard(75, 195, 300, 140, 'Visited Countries', `${stats.totalCountries}`, '#3B82F6', 'countries visited');
    drawCard(425, 195, 300, 140, 'Total Days', `${stats.totalDays}`, '#10B981', 'days total logged');
    drawCard(75, 365, 300, 140, 'Logged Stays', `${stats.totalTrips}`, '#F59E0B', 'distinct stays recorded');
    drawCard(425, 365, 300, 140, 'Density Rate', `${stats.percentLogged}%`, '#EC4899', 'of eligible life days');

    // 4. RADIAL DENSITY CIRCLE GRAPH (MIDDLE)
    const arcX = 400;
    const arcY = 650;
    const arcR = 100;

    // Draw background outer track circle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(arcX, arcY, arcR, 0, Math.PI * 2);
    ctx.stroke();

    // Draw colored dynamic progress arc
    const logPct = Math.min(100, Math.max(0, stats.percentLogged)) / 100;
    const flowGrad = ctx.createLinearGradient(arcX - arcR, arcY, arcX + arcR, arcY);
    flowGrad.addColorStop(0, '#3B82F6');
    flowGrad.addColorStop(0.5, '#8B5CF6');
    flowGrad.addColorStop(1, '#EC4899');

    ctx.strokeStyle = flowGrad;
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(arcX, arcY, arcR, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * logPct));
    ctx.stroke();

    // Inside concentric center text
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px "Space Grotesk", sans-serif';
    ctx.fillText(`${stats.percentLogged}%`, arcX, arcY + 8);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('TRAVEL DENSITY', arcX, arcY + 28);

    // 5. PROGRESSIVE COUNTRIES RANKING LIST (BOTTOM)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('◆ TIME BY COUNTRY RANKING (DAYS)', 75, 810);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(75, 825);
    ctx.lineTo(725, 825);
    ctx.stroke();

    const ranking = stats.ranking.slice(0, 4);
    let startY = 855;

    ranking.forEach((rank: any, idx: number) => {
      // Name
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px "Space Grotesk", sans-serif';
      ctx.fillText(`${idx + 1}. ${rank.country}`, 75, startY);

      // Value
      ctx.fillStyle = '#9CA3AF';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${rank.days} days (${rank.pct}%)`, 725, startY);

      // Bar container
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(75, startY + 12, 650, 10);

      // Bar active progress
      const barGrad = ctx.createLinearGradient(75, 0, 725, 0);
      barGrad.addColorStop(0, '#3B82F6');
      barGrad.addColorStop(1, '#8B5CF6');
      ctx.fillStyle = barGrad;
      ctx.fillRect(75, startY + 12, (rank.pct / 100) * 650, 10);

      startY += 55;
      ctx.textAlign = 'left'; // reset format
    });

    // 6. TECHNICAL CERTIFIED FOOTER
    const footY = 1110;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('CORE ENCRYPTION METRIC STAMP ID: 5292c131-851f-4a86-a73d-ee1e405f202a [STABLE_AISTUDIO_BUILD]', 75, footY);
    ctx.fillText(`INTEGRITY SYSTEM DEPLOYED ONLINE • ${new Date().toISOString()}`, 75, footY + 15);

    // ASCII art stamp logo in lower right
    ctx.fillStyle = '#3B82F6';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('// COMPUTED METALLIC COMPASS ROSE //', 725, footY);
    ctx.fillText('     ▲     ', 725, footY + 12);
    ctx.fillText('  ◄ ─── ►  ', 725, footY + 20);
    ctx.fillText('     ▼     ', 725, footY + 28);

    resolve();
  });
}

// GENERATE DESIGNER INTERACTIVE MULTI-PAGE OFFLINE PORTABLE PDF BOOKLET
export async function generatePortablePassportPDF(
  stays: Stay[], 
  userEmail: string = 'Traveller',
  mode: 'stays' | 'insights' = 'stays',
  stats: any = {},
  activeYear: string = 'All'
): Promise<jsPDF> {
  const doc = new jsPDF('p', 'pt', 'a4'); // A4 is 595 x 842 points
  
  // Helper to draw a beautiful page and return high resolution JPEG data url
  const addPageFromCanvas = (drawFn: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1130; // Matches professional print booklet ratio
    const ctx = canvas.getContext('2d')!;
    
    // Smooth font rendering settings
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    drawFn(canvas, ctx);
    
    const imgData = canvas.toDataURL('image/jpeg', 0.94);
    return imgData;
  };

  const pages: string[] = [];
  const chronStays = [...stays].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const totalCountries = new Set(stays.map(s => s.country)).size;
  const totalDays = stays.reduce((sum, s) => sum + calculateDays(s.startDate, s.endDate), 0);
  const totalStays = stays.length;

  if (mode === 'stays') {
    // ==========================================
    // PAGE 1: PORTRAIT VINTAGE COVER (GOLD ON BLUE)
    // ==========================================
    const coverImg = addPageFromCanvas((canvas, ctx) => {
      // Midnight Rich Blue
      ctx.fillStyle = '#0F1D36';
      ctx.fillRect(0, 0, 800, 1130);

      // Gold Foil borders
      ctx.strokeStyle = '#DFB254';
      ctx.lineWidth = 3;
      ctx.strokeRect(30, 30, 740, 1070);
      ctx.lineWidth = 1;
      ctx.strokeRect(38, 38, 724, 1054);

      // Corner gold ornaments
      const drawCornerOrnament = (cx: number, cy: number, rot: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.strokeStyle = '#DFB254';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(25, 0);
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 25);
        ctx.moveTo(8, 8);
        ctx.arc(8, 8, 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      };
      drawCornerOrnament(50, 50, 0);
      drawCornerOrnament(750, 50, Math.PI / 2);
      drawCornerOrnament(50, 1080, -Math.PI / 2);
      drawCornerOrnament(750, 1080, Math.PI);

      // Center Crest Stamp Logo
      ctx.save();
      ctx.translate(400, 500);
      ctx.strokeStyle = '#DFB254';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 95, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, 88, 0, Math.PI * 2);
      ctx.stroke();

      // Outer letters around circle
      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = '#DFB254';
      ctx.textAlign = 'center';
      
      const orbitText = "PASSPORT RECORD STATION • FLIGHT TRAJECTORY CONTROL PANEL • ";
      for (let i = 0; i < orbitText.length; i++) {
        const angle = (i * (Math.PI * 2 / orbitText.length)) - Math.PI / 2;
        ctx.save();
        ctx.rotate(angle);
        ctx.fillText(orbitText[i], 0, -100);
        ctx.restore();
      }

      // Compass rose star at center
      ctx.fillStyle = '#DFB254';
      ctx.font = '36px "Space Grotesk", sans-serif';
      ctx.fillText('★', 0, -4);
      ctx.font = 'bold 10px monospace';
      ctx.fillText('WORLD TRAVEL', 0, 24);
      ctx.fillText('COMPENDIUM', 0, 36);
      ctx.restore();

      // Titles
      ctx.fillStyle = '#DFB254';
      ctx.textAlign = 'center';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('• OFFICIAL DIPLOMATIC CREDENTIALS •', 400, 130);

      ctx.font = 'black 34px "Space Grotesk", sans-serif';
      ctx.fillText('CARNET DE VOYAGE', 400, 205);
      
      ctx.font = 'bold 15px "Space Grotesk", sans-serif';
      ctx.fillText('漫 空 旅 人 軌 跡 護 照', 400, 245);

      // Bottom Metadata Card Box
      ctx.fillStyle = 'rgba(223, 178, 84, 0.08)';
      ctx.fillRect(150, 800, 500, 200);
      ctx.strokeStyle = '#DFB254';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(150, 800, 500, 200);

      ctx.fillStyle = '#DFB254';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`BOOKLET HOLDER:  ${userEmail.toUpperCase()}`, 180, 840);
      ctx.fillText(`METRIC PASSPORT STAMP:  SA-TS-5292C131851F`, 180, 875);
      ctx.fillText(`TOTAL REGISTERED EVENTS:  ${totalStays} STAYS RECORDED`, 180, 910);
      ctx.fillText(`STATUS LEVEL:  APPROVED DEPUTY EXPLORER`, 180, 945);
      ctx.fillText(`CERTIFICATION DATE:  ${new Date().toISOString().substring(0, 10)}`, 180, 980);
    });
    pages.push(coverImg);

    // ==========================================
    // PAGE 2: BIOMETRICS LEDGER & STATS WIDGETS
    // ==========================================
    const bioImg = addPageFromCanvas((canvas, ctx) => {
      // Vintage cream paper color
      ctx.fillStyle = '#FAF9F5';
      ctx.fillRect(0, 0, 800, 1130);

      // Borders
      ctx.strokeStyle = '#4A4238';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, 30, 740, 1070);
      ctx.strokeStyle = '#8C8070';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(36, 36, 728, 1058);

      // Header Label
      ctx.fillStyle = '#1D1D1D';
      ctx.font = 'black 22px "Space Grotesk", sans-serif';
      ctx.fillText('BIOMETRIC TRAVELLER REGISTRY', 80, 90);
      ctx.fillStyle = '#6E6252';
      ctx.font = 'italic 11px Georgia, serif';
      ctx.fillText('Certified Identifications and Global Logbook Summary', 80, 110);

      // Biometrics layout dividing line
      ctx.strokeStyle = '#4A4238';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(80, 130);
      ctx.lineTo(720, 130);
      ctx.stroke();

      // Portrait photo box on the left
      ctx.fillStyle = '#EAE4D9';
      ctx.fillRect(80, 160, 160, 210);
      ctx.strokeStyle = '#8C8070';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(80, 160, 160, 210);

      // User Silhouette SVG representation
      ctx.save();
      ctx.translate(160, 245);
      ctx.strokeStyle = '#6E6252';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -25, 25, 0, Math.PI * 2); // head
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 45, 45, Math.PI, 0); // shoulders
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#6E6252';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('APPROVED TRAVELLER PHOTO', 160, 355);

      // Slanted verification stamp
      ctx.save();
      ctx.translate(210, 335);
      ctx.rotate(-15 * Math.PI / 180);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-50, -18, 100, 36);
      ctx.strokeRect(-46, -14, 92, 28);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('SYNCTIME APPNET', 0, -3);
      ctx.fillText('PASSPORT CONTROL', 0, 7);
      ctx.restore();

      // Right fields table
      ctx.textAlign = 'left';
      const drawFieldRow = (label: string, value: string, sy: number) => {
        ctx.fillStyle = '#8C8070';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(label, 270, sy);

        ctx.fillStyle = '#1D1D1D';
        ctx.font = 'bold 14px "Space Grotesk", sans-serif';
        ctx.fillText(value, 270, sy + 20);

        ctx.strokeStyle = '#EAE4D9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(270, sy + 30);
        ctx.lineTo(720, sy + 30);
        ctx.stroke();
      };

      drawFieldRow('SURNAME & GIVEN NAME / 姓名別名', userEmail.split('@')[0].toUpperCase(), 175);
      drawFieldRow('TRAVELLER ACCOUNT / 漫空使用者帳戶', userEmail, 230);
      drawFieldRow('ISSUING REQUISITE STAMP / 簽發認證終端', 'AI STUDIO SECURE VIRTUAL DEPLOY_KEY', 285);
      drawFieldRow('REGISTRY EXPORT DATE / 護照導出日期', new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }), 340);

      // Bottom half: Bento box summary statistics cards
      ctx.fillStyle = '#4A4238';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('◆ TRAJECTORY METRICS OVERVIEW', 80, 470);

      ctx.strokeStyle = '#8C8070';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(80, 480);
      ctx.lineTo(720, 480);
      ctx.stroke();

      const drawStatCard = (cx: number, cy: number, cw: number, ch: number, countNum: string, label: string, color: string) => {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx, cy, cw, ch);
        ctx.strokeStyle = '#E2DDD3';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx, cy, cw, ch);

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 40, cy);
        ctx.stroke();

        ctx.fillStyle = '#1D1D1D';
        ctx.font = 'bold 36px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(countNum, cx + cw/2, cy + ch/2 + 5);

        ctx.fillStyle = '#8C8070';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(label, cx + cw/2, cy + ch - 18);
      };

      drawStatCard(80, 510, 305, 140, `${totalCountries}`, 'COUNTRIES REGISTERED', '#3B82F6');
      drawStatCard(415, 510, 305, 140, `${totalDays}`, 'CUMULATIVE STAYS DAYS', '#10B981');
      drawStatCard(80, 680, 305, 140, `${totalStays}`, 'STOPS STAMPED IN LUGGAGE', '#F59E0B');
      
      const ratePct = totalDays > 0 ? Math.min(100, Math.round(totalDays * 0.45)) : 0;
      drawStatCard(415, 680, 305, 140, `${ratePct}%`, 'ACTIVE PATH DENSITY RATIO', '#EC4899');

      // Barcode at bottom of profile page
      const footY = 940;
      ctx.fillStyle = '#1D1D1D';
      let barX = 80;
      const barPattern = [4, 2, 7, 3, 2, 8, 4, 10, 2, 5, 2, 7, 10, 3, 2, 6, 2, 8, 3, 9, 2, 4, 10, 5, 2];
      barPattern.forEach(w => {
        ctx.fillRect(barX, footY, w, 40);
        barX += w + 2;
      });

      ctx.fillStyle = '#8C8070';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('IDENTITY CERTIFICATE DEPLOYED AND ENCRYPTED • SECURE SIGNATURE SYNCED', 80, footY + 54);
      ctx.fillText('INDEX CARNET NO: 5292C131-851F-4A86-A73D-EE1E405F202A', 80, footY + 65);
    });
    pages.push(bioImg);

    // ==========================================
    // PAGE 3+: VISA LOG STAMPS GRID
    // ==========================================
    const itemsPerPage = 6;
    const pageCount = Math.ceil(chronStays.length / itemsPerPage) || 1;

    for (let p = 0; p < pageCount; p++) {
      const pageStays = chronStays.slice(p * itemsPerPage, (p + 1) * itemsPerPage);
      const stampImg = addPageFromCanvas((canvas, ctx) => {
        ctx.fillStyle = '#FAF9F5';
        ctx.fillRect(0, 0, 800, 1130);

        // Borders
        ctx.strokeStyle = '#4A4238';
        ctx.lineWidth = 2;
        ctx.strokeRect(30, 30, 740, 1070);
        ctx.strokeStyle = '#8C8070';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(36, 36, 728, 1058);

        // Header Label
        ctx.fillStyle = '#1D1D1D';
        ctx.font = 'bold 16px "Space Grotesk", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('PASSPORT RECORD SEALS / 歷次出入境簽證戳印', 80, 90);
        ctx.font = 'mono bold 9px monospace';
        ctx.fillStyle = '#8C8070';
        ctx.fillText(`PAGINATION INDEX: ALBUM PAGE ${p + 1} OF ${pageCount} • ACTIVE VISAS SYSTEM`, 80, 110);

        ctx.strokeStyle = '#4A4238';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(80, 125);
        ctx.lineTo(720, 125);
        ctx.stroke();

        const gridX = [80, 410];
        const gridY = [160, 460, 760];
        const cardW = 310;
        const cardH = 260;

        pageStays.forEach((stay, index) => {
          const col = index % 2;
          const row = Math.floor(index / 2);
          const x = gridX[col];
          const y = gridY[row];

          const colors = [
            { bg: '#EEF2FF', border: '#4F46E5', text: '#312E81', ink: 'rgba(79, 70, 229, 0.4)' },
            { bg: '#FEF2F2', border: '#EF4444', text: '#7F1D1D', ink: 'rgba(239, 68, 68, 0.4)' },
            { bg: '#ECFDF5', border: '#10B981', text: '#064E3B', ink: 'rgba(16, 185, 129, 0.4)' },
            { bg: '#FFFBEB', border: '#F59E0B', text: '#78350F', ink: 'rgba(245, 158, 11, 0.4)' },
            { bg: '#FDF2F8', border: '#EC4899', text: '#701A75', ink: 'rgba(236, 72, 153, 0.4)' },
            { bg: '#F5F3FF', border: '#8B5CF6', text: '#4C1D95', ink: 'rgba(139, 92, 246, 0.4)' }
          ];
          const style = colors[(p * itemsPerPage + index) % colors.length];

          ctx.fillStyle = style.bg;
          ctx.fillRect(x, y, cardW, cardH);
          ctx.strokeStyle = style.border;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 6]);
          ctx.strokeRect(x, y, cardW, cardH);
          ctx.setLineDash([]);

          ctx.save();
          ctx.translate(x + 50, y + 60);
          ctx.rotate(-15 * Math.PI / 180);
          ctx.strokeStyle = style.ink;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(0, 0, 32, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = 'bold 8px monospace';
          ctx.fillStyle = style.text || style.border;
          ctx.textAlign = 'center';
          ctx.fillText('ENTRY SEEN', 0, -4);
          ctx.fillText(getCountryCode(stay.country), 0, 8);
          ctx.restore();

          ctx.textAlign = 'left';
          ctx.fillStyle = '#1D1D1D';
          ctx.font = 'bold 17px "Space Grotesk", sans-serif';
          ctx.fillText(stay.country, x + 110, y + 45);
          ctx.font = 'bold 11px monospace';
          ctx.fillStyle = '#6E6252';
          ctx.fillText(stay.city, x + 110, y + 65);

          ctx.strokeStyle = 'rgba(0,0,0,0.06)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 20, y + 105);
          ctx.lineTo(x + cardW - 20, y + 105);
          ctx.stroke();

          ctx.font = '9px monospace';
          ctx.fillStyle = '#8C8070';
          ctx.fillText('TRAJECTORY SPAN RANGE', x + 30, y + 130);
          ctx.fillStyle = '#1D1D1D';
          ctx.font = 'bold 11px "Space Grotesk", sans-serif';
          ctx.fillText(`${stay.startDate} ── ${stay.endDate}`, x + 30, y + 148);

          ctx.fillStyle = '#8C8070';
          ctx.font = '9px monospace';
          ctx.fillText('TIME CUMULATIVE COUNT', x + 30, y + 180);
          ctx.fillStyle = '#1D1D1D';
          ctx.font = 'bold 11px "Space Grotesk", sans-serif';
          ctx.fillText(`${calculateDays(stay.startDate, stay.endDate)} ACTIVE RESIDENCY DAYS`, x + 30, y + 198);

          if (stay.remark) {
            ctx.fillStyle = '#EC4899';
            ctx.font = 'italic 10px serif';
            ctx.fillText(`“${stay.remark}”`, x + 30, y + 230);
          }

          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(`#${p * itemsPerPage + index + 1} APPROVED IMMIGRATION`, x + cardW - 15, y + cardH - 12);
        });
      });
      pages.push(stampImg);
    }

    // ==========================================
    // PAGE 4: FLIGHT TRAJECTORY ROUTE NETWORK MAP
    // ==========================================
    const mapImg = addPageFromCanvas((canvas, ctx) => {
      ctx.fillStyle = '#FAF9F5';
      ctx.fillRect(0, 0, 800, 1130);

      ctx.strokeStyle = '#4A4238';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, 30, 740, 1070);
      ctx.strokeStyle = '#8C8070';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(36, 36, 728, 1058);

      ctx.fillStyle = '#1D1D1D';
      ctx.font = 'bold 20px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('WORLD TRANSIT TRAJECTORY NETWORK MAP', 400, 95);
      ctx.font = 'italic 11px Georgia, serif';
      ctx.fillStyle = '#6E6252';
      ctx.fillText('“A mapping of recorded geographical movements of the traveler”', 400, 115);

      ctx.strokeStyle = '#E2DDD3';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(400, 480, 180, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(400, 480, 275, 0, Math.PI * 2);
      ctx.stroke();

      const pts = chronStays.map(s => {
        const coords = parseCoordinateForCountry(s.country, s.city);
        return { ...s, lat: coords.lat, lng: coords.lng };
      });

      let minLat = 20, maxLat = 50, minLng = 10, maxLng = 140;
      if (pts.length > 0) {
        const lats = pts.map(p => p.lat);
        const lngs = pts.map(p => p.lng);
        minLat = Math.min(...lats);
        maxLat = Math.max(...lats);
        minLng = Math.min(...lngs);
        maxLng = Math.max(...lngs);
        
        const latDiff = maxLat - minLat || 10;
        const lngDiff = maxLng - minLng || 20;
        minLat -= latDiff * 0.22;
        maxLat += latDiff * 0.22;
        minLng -= lngDiff * 0.22;
        maxLng += lngDiff * 0.22;
      }

      const mappedPts = pts.map(p => {
        const x = 100 + ((p.lng - minLng) / (maxLng - minLng || 1)) * 600;
        const y = 200 + (1 - (p.lat - minLat) / (maxLat - minLat || 1)) * 520;
        return { ...p, x, y };
      });

      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 2.8;
      ctx.setLineDash([6, 9]);
      ctx.beginPath();
      mappedPts.forEach((p, index) => {
        if (index === 0) ctx.moveTo(p.x, p.y);
        else {
          const prev = mappedPts[index - 1];
          const cx = (prev.x + p.x) / 2;
          const cy = (prev.y + p.y) / 2 - Math.abs(prev.x - p.x) * 0.16;
          ctx.quadraticCurveTo(cx, cy, p.x, p.y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);

      mappedPts.forEach((p, idx) => {
        ctx.fillStyle = 'rgba(37, 99, 235, 0.12)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2563EB';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#1D1D1D';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${idx + 1}`, p.x + 13, p.y + 13);

        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.fillStyle = '#4A4238';
        ctx.textAlign = 'left';
        ctx.fillText(`${p.country}·${p.city}`, p.x + 12, p.y - 4);
      });

      const footY = 940;
      ctx.strokeStyle = '#4A4238';
      ctx.lineWidth = 1;
      ctx.strokeRect(100, footY - 10, 600, 110);
      
      ctx.fillStyle = '#4A4238';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`CUMULATIVE STOPS INDEX: ${totalStays} STATIONS SYNCED`, 120, footY + 20);
      ctx.fillText(`GLOBAL TRAJECTORY PROJECTION: CYCLICAL BEZIER INTERPOLATION`, 120, footY + 45);
      ctx.fillText(`AUTHENTICATION ID: ${userEmail.split('@')[0].toUpperCase()}#5292C131-851F`, 120, footY + 70);

      ctx.save();
      ctx.translate(610, footY + 45);
      ctx.rotate(10 * Math.PI / 180);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PASSPORT CONTROL', 0, -4);
      ctx.fillText('VERIFIED DIPLOMATIC', 0, 6);
      ctx.restore();
    });
    pages.push(mapImg);

  } else {
    // ==========================================================================================
    // TRAJECTORY INSIGHTS PDF MODE
    // ==========================================================================================
    const totalDaysNum = stats.totalDays || totalDays || 0;
    const totalCountriesNum = stats.totalCountries || totalCountries || 0;
    const totalTripsNum = stats.totalTrips || totalStays || 0;
    const densityPercent = stats.percentLogged || 0;

    // ==========================================
    // INSIGHTS PAGE 1: DEEP SLATE INSIGHTS COVER
    // ==========================================
    const insightsCover = addPageFromCanvas((canvas, ctx) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 1130);
      grad.addColorStop(0, '#090A10');
      grad.addColorStop(0.5, '#0F1223');
      grad.addColorStop(1, '#05060A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 1130);

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, 30, 740, 1070);

      const drawTechCross = (cx: number, cy: number) => {
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx - 15, cy); ctx.lineTo(cx + 15, cy);
        ctx.moveTo(cx, cy - 15); ctx.lineTo(cx, cy + 15);
        ctx.stroke();
      };
      drawTechCross(30, 30);
      drawTechCross(770, 30);
      drawTechCross(30, 1100);
      drawTechCross(770, 1100);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(400, 560, 240, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(400, 560, 360, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#8B5CF6';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GLOBAL TRAJECTORY LOGBOOK INTEL CODES', 400, 150);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'black 34px "Space Grotesk", sans-serif';
      ctx.fillText('TRAJECTORY ANALYTICS', 400, 220);
      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = '#3B82F6';
      ctx.fillText('DATA & STATISTICAL INSIGHTS ANNUAL FILE', 400, 260);

      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = 'italic 12px serif';
      ctx.fillText(`個人智慧旅行軌跡綜合統計與數據分析報告 • ${activeYear} 年度範疇`, 400, 290);

      ctx.save();
      ctx.translate(400, 560);
      ctx.strokeStyle = '#8B5CF6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 110, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, 102, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 44px "Space Grotesk", sans-serif';
      ctx.fillText(`${densityPercent}%`, 0, -5);
      ctx.fillStyle = '#9CA3AF';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('INTELLIGENT DENSITY', 0, 26);
      ctx.fillText('INDEX DEPLOYED', 0, 38);
      ctx.restore();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(150, 820, 500, 190);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeRect(150, 820, 500, 190);

      ctx.fillStyle = '#9CA3AF';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`TRAVELLER ACCOUNT:`, 180, 860);
      ctx.fillText(`COMPILING SCOPE:`, 180, 895);
      ctx.fillText(`TOTAL ENUMERATED DAYS:`, 180, 930);
      ctx.fillText(`RECORDS STATUS ENVELOPE:`, 180, 965);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px "Space Grotesk", sans-serif';
      ctx.fillText(userEmail, 360, 860);
      ctx.fillText(`${activeYear} YEARLY INSIGHTS`, 360, 895);
      ctx.fillText(`${totalDaysNum} DAYS COMPLETED`, 360, 930);
      ctx.fillText('CLASSIFIED PASS-TRAJECT STATE', 360, 965);
    });
    pages.push(insightsCover);

    // ==========================================
    // INSIGHTS PAGE 2: BENTO GRID STATS & RADIAL CIRCLE
    // ==========================================
    const insightsDashboard = addPageFromCanvas((canvas, ctx) => {
      ctx.fillStyle = '#090A10';
      ctx.fillRect(0, 0, 800, 1130);

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, 30, 740, 1070);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px "Space Grotesk", sans-serif';
      ctx.fillText('STATISTICAL METRICS OVERVIEW', 80, 90);
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '9px monospace';
      ctx.fillText('INTELLIGENT INSIGHTS DECIPHERED FROM HISTORIC VISA LEDGER', 80, 110);

      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(80, 125);
      ctx.lineTo(720, 125);
      ctx.stroke();

      const drawDarkBento = (cx: number, cy: number, cw: number, ch: number, statNum: string, label: string, color: string) => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(cx, cy, cw, ch);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx, cy, cw, ch);

        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 45, cy);
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 44px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(statNum, cx + cw/2, cy + ch/2 + 5);

        ctx.fillStyle = '#9CA3AF';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(label, cx + cw/2, cy + ch - 22);
      };

      drawDarkBento(80, 160, 305, 170, `${totalCountriesNum}`, 'COUNTRIES EXPLORED', '#3B82F6');
      drawDarkBento(415, 160, 305, 170, `${totalDaysNum}`, 'TOTAL LOGGED TRAJECT DAYS', '#10B981');
      drawDarkBento(80, 370, 305, 170, `${totalTripsNum}`, 'STAMPED STAYS ENTRIES', '#F59E0B');
      drawDarkBento(415, 370, 305, 170, `${densityPercent}%`, 'ACTIVE MATRIX DENSITY', '#EC4899');

      const ox = 400;
      const oy = 770;
      const or = 130;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 25;
      ctx.beginPath();
      ctx.arc(ox, oy, or, 0, Math.PI * 2);
      ctx.stroke();

      const prog = Math.min(100, Math.max(0, densityPercent)) / 100;
      const flowGrd = ctx.createLinearGradient(ox - or, oy, ox + or, oy);
      flowGrd.addColorStop(0, '#3B82F6');
      flowGrd.addColorStop(0.5, '#8B5CF6');
      flowGrd.addColorStop(1, '#EC4899');

      ctx.strokeStyle = flowGrd;
      ctx.lineWidth = 26;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(ox, oy, or, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * prog));
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.font = 'bold 48px "Space Grotesk", sans-serif';
      ctx.fillText(`${densityPercent}%`, ox, oy + 12);
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText('OVERALL TRAVEL SPACE DENSITY', ox, oy + 38);

      const footY = 1010;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('COMPILATION MATRIX SYSTEM INTEGRAL CODE: 5292C131-851F-4A86-A73D-EE1E405F202A', 80, footY);
      ctx.fillText(`SECURE RECORD STAMPS RECTIFIED ONLINE BY SYNCTIME ENGINE • ${new Date().toISOString()}`, 80, footY + 16);
    });
    pages.push(insightsDashboard);

    // ==========================================
    // INSIGHTS PAGE 3: COUNTRY RANKING & TIMELINE
    // ==========================================
    const insightsRanking = addPageFromCanvas((canvas, ctx) => {
      ctx.fillStyle = '#090A10';
      ctx.fillRect(0, 0, 800, 1130);

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, 30, 740, 1070);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px "Space Grotesk", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('◆ TIME BY COUNTRY CLASSIFICATION & CHRONOLOGY', 80, 95);

      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(80, 115);
      ctx.lineTo(720, 115);
      ctx.stroke();

      const rankingList = stats.ranking || [];
      const showRanking = rankingList.slice(0, 5);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('TOP DESTINATION RANKINGS (RELATIVE DAY WEIGHTS)', 80, 155);

      let barY = 190;
      showRanking.forEach((rank: any, idx: number) => {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 13px "Space Grotesk", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${idx + 1}. ${rank.country}`, 80, barY);

        ctx.fillStyle = '#9CA3AF';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${rank.days} days (${rank.pct}%)`, 720, barY);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(80, barY + 10, 640, 12);

        const barGrd = ctx.createLinearGradient(80, 0, 720, 0);
        barGrd.addColorStop(0, '#3B82F6');
        barGrd.addColorStop(1, '#8B5CF6');
        ctx.fillStyle = barGrd;
        ctx.fillRect(80, barY + 10, (rank.pct / 100) * 640, 12);

        barY += 52;
      });

      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('CHRONOLOGY EVENT INDEX (RECORDED COMPENDIUM EVENTS)', 80, 480);

      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.moveTo(80, 498);
      ctx.lineTo(720, 498);
      ctx.stroke();

      let rowY = 535;
      const recentEvents = chronStays.slice(-8);

      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(80, 510, 640, 26);
      ctx.fillStyle = '#3B82F6';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('IDX', 95, 526);
      ctx.fillText('COUNTRY/CITY OF STAY', 135, 526);
      ctx.fillText('START DATE', 360, 526);
      ctx.fillText('END DATE', 485, 526);
      ctx.fillText('SPAN', 610, 526);

      recentEvents.forEach((stay, idx) => {
        ctx.fillStyle = (idx % 2 === 0) ? 'rgba(255,255,255,0.01)' : 'transparent';
        if (idx % 2 === 0) {
          ctx.fillRect(80, rowY - 14, 640, 26);
        }

        ctx.fillStyle = '#9CA3AF';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`#${idx + 1}`, 95, rowY);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px "Space Grotesk", sans-serif';
        ctx.fillText(`${stay.country}·${stay.city}`, 135, rowY);

        ctx.fillStyle = '#9CA3AF';
        ctx.font = '10px monospace';
        ctx.fillText(stay.startDate, 360, rowY);
        ctx.fillText(stay.endDate, 485, rowY);

        ctx.fillStyle = '#10B981';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${calculateDays(stay.startDate, stay.endDate)}D`, 610, rowY);

        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(80, rowY + 12);
        ctx.lineTo(720, rowY + 12);
        ctx.stroke();

        rowY += 28;
      });

      const footY = 930;
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(80, footY + 40, 640, 70);

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '9px monospace';
      ctx.fillText('SYSTEM STATUS: ENCRYPTED AND INTEGRATED ONLINE', 100, footY + 65);
      ctx.fillText('VERIFY COMPLIANT ID: 5292C131-851F-4A86-A73D-EE1E405F202A', 100, footY + 86);

      ctx.fillStyle = '#3B82F6';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('▲ CLASSIFIED', 700, footY + 65);
      ctx.fillText('◄  ► GLOBAL INTEL', 700, footY + 77);
      ctx.fillText('▼ ENVELOPE', 700, footY + 89);
    });
    pages.push(insightsRanking);
  }

  // Compile all high resolution canvas layouts as sequential pages inside true PDF booklet
  pages.forEach((imgData, index) => {
    if (index > 0) {
      doc.addPage();
    }
    doc.addImage(imgData, 'JPEG', 0, 0, 595, 842, undefined, 'FAST');
  });

  return doc;
}

