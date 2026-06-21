import React, { useEffect, useRef, useState } from 'react';
import { Shield, Clock, MapPin, AlertTriangle, X } from 'lucide-react';

interface LiveCameraFeedProps {
    junctionName: string;
    policeStation: string;
    clusterType: string;
    dominantVehicle: string;
    dominantViolation: string;
}

const getSeededRandom = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return () => {
        const x = Math.sin(hash++) * 10000;
        return x - Math.floor(x);
    };
};

const getVehicleEmoji = (type: string): string => {
    const t = type.toUpperCase();
    if (t.includes('SCOOTER') || t.includes('MOTOR CYCLE') || t.includes('MOPED') || t.includes('BIKE')) return '🏍️';
    if (t.includes('AUTO') || t.includes('RICKSHAW')) return '🛺';
    if (t.includes('TRUCK') || t.includes('LORRY') || t.includes('GOODS')) return '🚚';
    if (t.includes('BUS') || t.includes('OMNI')) return '🚌';
    if (t.includes('SUV') || t.includes('JEEP')) return '🚙';
    return '🚗';
};

export const LiveCameraFeed: React.FC<LiveCameraFeedProps> = ({ 
    junctionName, 
    policeStation, 
    clusterType,
    dominantVehicle,
    dominantViolation
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [showModal, setShowModal] = useState(false);

    // Seed variables inside state to keep them consistent across renders for a single hotspot
    const [simulationData, setSimulationData] = useState<any>(null);

    const displayVehicleType = (dominantVehicle || 'CAR').toUpperCase();
    const violatorEmoji = getVehicleEmoji(dominantVehicle);

    useEffect(() => {
        const rand = getSeededRandom(junctionName + policeStation);
        const letters = String.fromCharCode(65 + Math.floor(rand() * 26)) + String.fromCharCode(65 + Math.floor(rand() * 26));
        const num = Math.floor(1000 + rand() * 9000);
        const uniquePlate = `KA-${Math.floor(1 + rand() * 55).toString().padStart(2, '0')}-${letters}-${num}`;

        const startHour = Math.floor(8 + rand() * 10);
        const startMin = Math.floor(10 + rand() * 45);
        const endHour = startHour + Math.floor(1 + rand() * 2);
        const endMin = (startMin + Math.floor(10 + rand() * 45)) % 60;
        const timeFromTo = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')} AM - ${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')} ${endHour >= 12 ? 'PM' : 'AM'}`;

        setSimulationData({
            uniquePlate,
            timeFromTo,
            randSeed: rand()
        });
    }, [junctionName, policeStation]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !simulationData) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const baseSpeed = 0.0035;
        const vehiclePool = [
            { type: 'Car', emoji: '🚗' },
            { type: 'SUV', emoji: '🚙' },
            { type: 'Bike', emoji: '🏍️' },
            { type: 'Auto', emoji: '🛺' },
            { type: 'Bus', emoji: '🚌' },
            { type: 'Truck', emoji: '🚚' },
            { type: 'Scooter', emoji: '🛵' },
            { type: 'Ambulance', emoji: '🚑' },
            { type: 'Police', emoji: '🚓' }
        ];

        const normalVehicles = [
            { z: 0.15, speed: baseSpeed, lane: 0, type: 'Car', emoji: '🚗', label: 'KA-03-AB-4210' },
            { z: 0.55, speed: baseSpeed * 1.3, lane: 1, type: 'Bike', emoji: '🏍️', label: 'KA-04-XY-9001' },
            { z: 0.8, speed: baseSpeed * 0.9, lane: 0, type: 'Auto', emoji: '🛺', label: 'KA-51-MM-3434' },
        ];

        const violatorZ = 0.7;

        // Helper to draw a 3D wireframe box
        const draw3DBox = (cxF: number, cyF: number, wF: number, hF: number, cxB: number, cyB: number, wB: number, hB: number, scale: number, strokeColor: string, isFlash: boolean) => {
            ctx.save();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = Math.max(1.2, Math.floor(1.8 * scale));
            
            if (isFlash) {
                ctx.shadowColor = strokeColor;
                ctx.shadowBlur = 8;
            }
            
            // Front corners
            const fTL = { x: cxF - wF / 2, y: cyF - hF };
            const fTR = { x: cxF + wF / 2, y: cyF - hF };
            const fBL = { x: cxF - wF / 2, y: cyF };
            const fBR = { x: cxF + wF / 2, y: cyF };
            
            // Back corners
            const bTL = { x: cxB - wB / 2, y: cyB - hB };
            const bTR = { x: cxB + wB / 2, y: cyB - hB };
            const bBL = { x: cxB - wB / 2, y: cyB };
            const bBR = { x: cxB + wB / 2, y: cyB };
            
            // 1. Draw back face
            ctx.beginPath();
            ctx.moveTo(bTL.x, bTL.y);
            ctx.lineTo(bTR.x, bTR.y);
            ctx.lineTo(bBR.x, bBR.y);
            ctx.lineTo(bBL.x, bBL.y);
            ctx.closePath();
            ctx.stroke();
            
            // 2. Draw connecting edges (drawn semi-transparent for 3D realism)
            ctx.strokeStyle = strokeColor + '66'; // 40% opacity
            ctx.beginPath();
            ctx.moveTo(bTL.x, bTL.y); ctx.lineTo(fTL.x, fTL.y);
            ctx.moveTo(bTR.x, bTR.y); ctx.lineTo(fTR.x, fTR.y);
            ctx.moveTo(bBL.x, bBL.y); ctx.lineTo(fBL.x, fBL.y);
            ctx.moveTo(bBR.x, bBR.y); ctx.lineTo(fBR.x, fBR.y);
            ctx.stroke();
            
            // 3. Draw front face (solid outline)
            ctx.strokeStyle = strokeColor;
            ctx.beginPath();
            ctx.moveTo(fTL.x, fTL.y);
            ctx.lineTo(fTR.x, fTR.y);
            ctx.lineTo(fBR.x, fBR.y);
            ctx.lineTo(fBL.x, fBL.y);
            ctx.closePath();
            ctx.stroke();
            
            ctx.restore();
        };

        const draw = () => {
            if (!ctx || !canvas) return;

            // 1. Tech background
            ctx.fillStyle = '#090a0f';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw sky gradient
            let skyGrad = ctx.createLinearGradient(0, 0, 0, 80);
            skyGrad.addColorStop(0, '#040508');
            skyGrad.addColorStop(1, '#0e1017');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, canvas.width, 80);

            // Draw wireframe ground grid lines on the left and right sides
            ctx.strokeStyle = 'rgba(40, 116, 240, 0.08)';
            ctx.lineWidth = 1;
            for (let i = -12; i <= 12; i++) {
                if (Math.abs(i) <= 1) continue; // Skip road path
                ctx.beginPath();
                ctx.moveTo(340 + i * 20, 80);
                ctx.lineTo(340 + i * 180, 330);
                ctx.stroke();
            }
            // Horizontal grid depth lines
            for (let j = 0; j <= 8; j++) {
                const zGrid = Math.pow(j / 8, 2.5);
                const yGrid = 80 + zGrid * 250;
                ctx.beginPath();
                ctx.moveTo(0, yGrid);
                ctx.lineTo(canvas.width, yGrid);
                ctx.stroke();
            }

            // Draw 3D wireframe building blocks lining the street sides
            ctx.strokeStyle = 'rgba(40, 116, 240, 0.12)';
            ctx.lineWidth = 1;

            // --- Left side buildings ---
            // Building A (Far)
            ctx.beginPath();
            ctx.moveTo(210, 160); // top front corner
            ctx.lineTo(260, 180); // top back corner
            ctx.lineTo(260, 270); // bottom back
            ctx.lineTo(210, 250); // bottom front
            ctx.closePath();
            ctx.stroke();

            // Building B (Mid)
            ctx.fillStyle = '#10121a';
            ctx.beginPath();
            ctx.moveTo(110, 110);
            ctx.lineTo(190, 140);
            ctx.lineTo(190, 290);
            ctx.lineTo(110, 250);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // grid windows on Building B
            ctx.strokeStyle = 'rgba(40, 116, 240, 0.06)';
            for (let wy = 150; wy < 230; wy += 20) {
                ctx.beginPath();
                ctx.moveTo(130, wy); ctx.lineTo(175, wy + 15);
                ctx.stroke();
            }

            // Building C (Near)
            ctx.fillStyle = '#0b0d12';
            ctx.strokeStyle = 'rgba(40, 116, 240, 0.14)';
            ctx.beginPath();
            ctx.moveTo(0, 50);
            ctx.lineTo(90, 90);
            ctx.lineTo(90, 320);
            ctx.lineTo(0, 280);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // --- Right side buildings ---
            // Building D (Far)
            ctx.beginPath();
            ctx.moveTo(470, 160);
            ctx.lineTo(420, 180);
            ctx.lineTo(420, 270);
            ctx.lineTo(470, 250);
            ctx.closePath();
            ctx.stroke();

            // Building E (Mid)
            ctx.fillStyle = '#10121a';
            ctx.beginPath();
            ctx.moveTo(570, 110);
            ctx.lineTo(490, 140);
            ctx.lineTo(490, 290);
            ctx.lineTo(570, 250);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // grid windows on Building E
            ctx.strokeStyle = 'rgba(40, 116, 240, 0.06)';
            for (let wy = 150; wy < 230; wy += 20) {
                ctx.beginPath();
                ctx.moveTo(550, wy); ctx.lineTo(505, wy + 15);
                ctx.stroke();
            }

            // Building F (Near)
            ctx.fillStyle = '#0b0d12';
            ctx.strokeStyle = 'rgba(40, 116, 240, 0.14)';
            ctx.beginPath();
            ctx.moveTo(680, 50);
            ctx.lineTo(590, 90);
            ctx.lineTo(590, 320);
            ctx.lineTo(680, 280);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Draw Road pavement trapezoid in 3D perspective
            let roadGrad = ctx.createLinearGradient(0, 80, 0, 330);
            roadGrad.addColorStop(0, '#1c1f26');
            roadGrad.addColorStop(1, '#0f1115');
            ctx.fillStyle = roadGrad;
            ctx.beginPath();
            ctx.moveTo(300, 80); // top-left
            ctx.lineTo(380, 80); // top-right
            ctx.lineTo(630, 330); // bottom-right
            ctx.lineTo(50, 330); // bottom-left
            ctx.closePath();
            ctx.fill();

            // Draw tech curbs (road edge lines)
            ctx.strokeStyle = '#2874F0';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(300, 80);
            ctx.lineTo(50, 330);
            ctx.moveTo(380, 80);
            ctx.lineTo(630, 330);
            ctx.stroke();

            // Draw 3D Street Light Poles with warm light cones
            const poleZOffsets = [0.22, 0.48, 0.74, 0.96];
            poleZOffsets.forEach(zPole => {
                const yVal = 80 + zPole * 250;
                const wVal = 80 + zPole * 500;
                const leftX = 340 - wVal / 2;
                const rightX = 340 + wVal / 2;
                const scale = 0.15 + zPole * 0.95;
                
                const poleH = 95 * scale;
                const armW = 22 * scale;
                
                ctx.save();
                
                // Left Pole
                ctx.strokeStyle = 'rgba(40, 116, 240, 0.35)'; // glowing neon blue pole
                ctx.lineWidth = Math.max(1, 2 * scale);
                ctx.beginPath();
                ctx.moveTo(leftX, yVal);
                ctx.lineTo(leftX, yVal - poleH);
                ctx.lineTo(leftX + armW, yVal - poleH);
                ctx.stroke();
                
                // Light glow source
                ctx.fillStyle = '#FFE500';
                ctx.beginPath();
                ctx.arc(leftX + armW, yVal - poleH, 3 * scale, 0, 2 * Math.PI);
                ctx.fill();

                // Cone of yellow light on the ground curb
                let lightBeam = ctx.createRadialGradient(leftX + armW, yVal - poleH, 0, leftX + armW, yVal, 40 * scale);
                lightBeam.addColorStop(0, 'rgba(255, 229, 0, 0.08)');
                lightBeam.addColorStop(1, 'rgba(255, 229, 0, 0)');
                ctx.fillStyle = lightBeam;
                ctx.beginPath();
                ctx.moveTo(leftX + armW, yVal - poleH);
                ctx.lineTo(leftX - 15 * scale, yVal);
                ctx.lineTo(leftX + 25 * scale, yVal);
                ctx.closePath();
                ctx.fill();
                
                // Right Pole
                ctx.strokeStyle = 'rgba(40, 116, 240, 0.35)';
                ctx.lineWidth = Math.max(1, 2 * scale);
                ctx.beginPath();
                ctx.moveTo(rightX, yVal);
                ctx.lineTo(rightX, yVal - poleH);
                ctx.lineTo(rightX - armW, yVal - poleH);
                ctx.stroke();
                
                // Light glow source
                ctx.fillStyle = '#FFE500';
                ctx.beginPath();
                ctx.arc(rightX - armW, yVal - poleH, 3 * scale, 0, 2 * Math.PI);
                ctx.fill();

                // Cone of yellow light on the ground curb
                let lightBeamR = ctx.createRadialGradient(rightX - armW, yVal - poleH, 0, rightX - armW, yVal, 40 * scale);
                lightBeamR.addColorStop(0, 'rgba(255, 229, 0, 0.08)');
                lightBeamR.addColorStop(1, 'rgba(255, 229, 0, 0)');
                ctx.fillStyle = lightBeamR;
                ctx.beginPath();
                ctx.moveTo(rightX - armW, yVal - poleH);
                ctx.lineTo(rightX + 15 * scale, yVal);
                ctx.lineTo(rightX - 25 * scale, yVal);
                ctx.closePath();
                ctx.fill();
                
                ctx.restore();
            });

            // Draw Lane divider dashes converging to horizon
            const tOffset = (Date.now() / 600) % 1.0;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            for (let i = 0; i < 10; i++) {
                const zStart = (i - tOffset) / 9;
                if (zStart < 0 || zStart > 1) continue;
                const zEnd = zStart + 0.05;
                
                const yStart = 80 + zStart * 250;
                const yEnd = 80 + zEnd * 250;
                const wStart = 80 + zStart * 500;
                const wEnd = 80 + zEnd * 500;
                
                // Left lane divider
                const x1Start = 340 - wStart / 6;
                const x1End = 340 - wEnd / 6;
                ctx.lineWidth = 1 + zStart * 2;
                ctx.beginPath();
                ctx.moveTo(x1Start, yStart);
                ctx.lineTo(x1End, yEnd);
                ctx.stroke();

                // Right lane divider
                const x2Start = 340 + wStart / 6;
                const x2End = 340 + wEnd / 6;
                ctx.beginPath();
                ctx.moveTo(x2Start, yStart);
                ctx.lineTo(x2End, yEnd);
                ctx.stroke();
            }

            // Draw background traffic
            normalVehicles.forEach(v => {
                v.z += v.speed;
                if (v.z > 1.0) {
                    v.z = 0.0;
                    v.lane = Math.random() < 0.5 ? 0 : 1;
                    
                    // Pick random vehicle type from pool for diversity
                    const randomType = vehiclePool[Math.floor(Math.random() * vehiclePool.length)];
                    v.type = randomType.type;
                    v.emoji = randomType.emoji;

                    const letters = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + String.fromCharCode(65 + Math.floor(Math.random() * 26));
                    const num = Math.floor(1000 + Math.random() * 9000);
                    v.label = `KA-03-${letters}-${num}`;
                }

                const yVal = 80 + v.z * 250;
                const wVal = 80 + v.z * 500;
                const leftX = 340 - wVal / 2;
                
                let lanePct = 0.5;
                if (v.lane === 0) lanePct = 0.16;
                else lanePct = 0.5;
                
                const cx = leftX + lanePct * wVal;
                const scale = 0.15 + v.z * 0.95;
                const w = 80 * scale;
                const h = 50 * scale;
                
                // Back face depth coordinates
                const zBack = Math.max(0, v.z - 0.08);
                const yValBack = 80 + zBack * 250;
                const wValBack = 80 + zBack * 500;
                const leftXBack = 340 - wValBack / 2;
                const cxBack = leftXBack + lanePct * wValBack;
                const wBack = 80 * (0.15 + zBack * 0.95);
                const hBack = 50 * (0.15 + zBack * 0.95);

                ctx.save();
                
                // Headlight beam (cone) casting onto road in perspective
                let headlightGrad = ctx.createRadialGradient(cx, yVal - h * 0.1, 0, cx, yVal + 90 * scale, 50 * scale);
                headlightGrad.addColorStop(0, 'rgba(255, 253, 224, 0.25)');
                headlightGrad.addColorStop(0.3, 'rgba(255, 235, 59, 0.12)');
                headlightGrad.addColorStop(1, 'rgba(255, 235, 59, 0)');
                ctx.fillStyle = headlightGrad;
                ctx.beginPath();
                ctx.moveTo(cx - 4 * scale, yVal);
                ctx.lineTo(cx - 30 * scale, yVal + 110 * scale);
                ctx.lineTo(cx + 30 * scale, yVal + 110 * scale);
                ctx.lineTo(cx + 4 * scale, yVal);
                ctx.closePath();
                ctx.fill();

                // Draw shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.beginPath();
                ctx.ellipse(cx, yVal, w * 0.45, 5 * scale, 0, 0, 2 * Math.PI);
                ctx.fill();

                // Draw 3D wireframe bounding cube (Green)
                draw3DBox(cx, yVal, w, h, cxBack, yValBack, wBack, hBack, scale, '#4CAF50', false);

                // Render vehicle emoji centered on front face
                ctx.font = `${Math.floor(36 * scale)}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(v.emoji, cx, yVal - h / 2 + 2);

                // Render tag (if close enough)
                if (v.z >= 0.25) {
                    const tagHeight = Math.max(14, 18 * scale);
                    ctx.fillStyle = 'rgba(76, 175, 80, 0.9)';
                    ctx.fillRect(cx - w / 2, yVal - h - tagHeight, w, tagHeight);
                    
                    ctx.fillStyle = '#fff';
                    ctx.font = `bold ${Math.max(8, Math.floor(9 * scale))}px monospace`;
                    ctx.textAlign = 'center';
                    ctx.fillText(`${v.type}:${v.label.substring(9)}`, cx, yVal - h - tagHeight / 2 + 1);
                }
                
                ctx.restore();
            });

            // Draw Violator Vehicle (stationary shoulder parking)
            const flash = Math.floor(Date.now() / 450) % 2 === 0;
            const vYVal = 80 + violatorZ * 250;
            const vWVal = 80 + violatorZ * 500;
            const vLeftX = 340 - vWVal / 2;
            
            const vLanePct = 0.84;
            const vCx = vLeftX + vLanePct * vWVal; // parked on the right shoulder lane
            const vScale = 0.15 + violatorZ * 0.95;
            const vW = 85 * vScale;
            const vH = 52 * vScale;
            
            // Violator back depth coordinates
            const vzBack = Math.max(0, violatorZ - 0.08);
            const vyValBack = 80 + vzBack * 250;
            const vwValBack = 80 + vzBack * 500;
            const vleftXBack = 340 - vwValBack / 2;
            const vcxBack = vleftXBack + vLanePct * vwValBack;
            const vwBack = 85 * (0.15 + vzBack * 0.95);
            const vhBack = 52 * (0.15 + vzBack * 0.95);

            ctx.save();

            // Draw shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.beginPath();
            ctx.ellipse(vCx, vYVal, vW * 0.48, 6 * vScale, 0, 0, 2 * Math.PI);
            ctx.fill();

            // Draw 3D wireframe bounding cube (Red/Orange flashing)
            draw3DBox(vCx, vYVal, vW, vH, vcxBack, vyValBack, vwBack, vhBack, vScale, flash ? '#FF3B30' : '#E67300', flash);

            // Render vehicle emoji centered on front face
            ctx.font = `${Math.floor(40 * vScale)}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(violatorEmoji, vCx, vYVal - vH / 2 + 2);

            // Bounding box alert tag
            const vTagHeight = Math.max(15, 20 * vScale);
            ctx.fillStyle = flash ? 'rgba(255, 59, 48, 0.95)' : 'rgba(230, 115, 0, 0.95)';
            ctx.fillRect(vCx - vW / 2, vYVal - vH - vTagHeight, vW, vTagHeight);
            
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${Math.max(9, Math.floor(10 * vScale))}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(`ALERT:${simulationData.uniquePlate.substring(9)}`, vCx, vYVal - vH - vTagHeight / 2 + 1);

            // Bounding box connector line to alert panel
            ctx.strokeStyle = 'rgba(255, 59, 48, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(vCx, vYVal - vH / 2);
            ctx.lineTo(vCx, 60);
            ctx.lineTo(30, 60);
            ctx.stroke();

            ctx.restore();

            // CCTV Camera HUD Overlays
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(20, 20); ctx.lineTo(50, 20); ctx.moveTo(20, 20); ctx.lineTo(20, 50); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(canvas.width - 20, 20); ctx.lineTo(canvas.width - 50, 20); ctx.moveTo(canvas.width - 20, 20); ctx.lineTo(canvas.width - 20, 50); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(20, canvas.height - 20); ctx.lineTo(50, canvas.height - 20); ctx.moveTo(20, canvas.height - 20); ctx.lineTo(20, canvas.height - 50); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(canvas.width - 20, canvas.height - 20); ctx.lineTo(canvas.width - 50, canvas.height - 20); ctx.moveTo(canvas.width - 20, canvas.height - 20); ctx.lineTo(canvas.width - 20, canvas.height - 50); ctx.stroke();

            // Center crosshair
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2 - 20, canvas.height / 2);
            ctx.lineTo(canvas.width / 2 + 20, canvas.height / 2);
            ctx.moveTo(canvas.width / 2, canvas.height / 2 - 20);
            ctx.lineTo(canvas.width / 2, canvas.height / 2 + 20);
            ctx.stroke();

            // Scanlines
            ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
            for (let i = 0; i < canvas.height; i += 6) {
                ctx.fillRect(0, i, canvas.width, 2);
            }

            // Blinking REC status and Camera ID
            ctx.fillStyle = flash ? '#FF3B30' : 'transparent';
            ctx.beginPath(); ctx.arc(40, 42, 6, 0, 2 * Math.PI); ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 15px var(--font-mono), monospace';
            ctx.fillText('REC', 56, 47);

            const camCode = policeStation.replace(/\s+/g, '').substring(0, 3).toUpperCase();
            const hashNum = Math.abs(junctionName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 900 + 100;
            ctx.fillText(`CAM-${camCode}-${hashNum}`, 105, 47);

            // Active Scan indicator tag
            ctx.fillStyle = 'rgba(76, 175, 80, 0.15)';
            ctx.fillRect(canvas.width - 190, 27, 170, 26);
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(canvas.width - 190, 27, 170, 26);
            ctx.fillStyle = '#4CAF50';
            ctx.font = 'bold 12px var(--font-mono), monospace';
            ctx.fillText('● CLICK FEED FOR DETAILS', canvas.width - 178, 44);

            // Click instructions overlay at the bottom
            ctx.fillStyle = 'rgba(40, 116, 240, 0.9)';
            ctx.fillRect(20, 335, canvas.width - 40, 45);
            ctx.strokeStyle = 'rgba(40, 116, 240, 1)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(20, 335, canvas.width - 40, 45);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px var(--font-body), sans-serif';
            ctx.fillText('DETECTION CONSOLE ACTIVE', 35, 352);
            ctx.font = '11px var(--font-body), sans-serif';
            ctx.fillText('Click anywhere on the feed to view crisp detection logs & diagnostics.', 35, 370);

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [junctionName, policeStation, dominantVehicle, simulationData]);

    return (
        <>
            <div style={{ padding: '8px', backgroundColor: '#0f1115', borderRadius: '8px', border: '1px solid var(--fk-border)', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setShowModal(true)}>
                <canvas 
                    ref={canvasRef} 
                    width={680} 
                    height={400} 
                    style={{ display: 'block', width: '100%', height: 'auto', borderRadius: '4px' }}
                />
            </div>

            {showModal && simulationData && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }} onClick={() => setShowModal(false)}>
                    <div style={{
                        width: '450px',
                        backgroundColor: 'var(--fk-white)',
                        borderRadius: '12px',
                        boxShadow: 'var(--fk-shadow)',
                        border: '1px solid var(--fk-border)',
                        overflow: 'hidden',
                        animation: 'fadeIn 0.2s ease-out'
                    }} onClick={(e) => e.stopPropagation()}>
                        
                        {/* Header */}
                        <div style={{
                            backgroundColor: 'var(--fk-blue)',
                            color: 'var(--fk-white)',
                            padding: '16px 20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Shield size={18} color="var(--fk-yellow)" />
                                <span style={{ fontWeight: 'bold', fontSize: '15px', letterSpacing: '0.5px' }}>BTP AI DETECTION LOG</span>
                            </div>
                            <button 
                                onClick={() => setShowModal(false)}
                                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', alignItems: 'center' }}>
                                <div style={{
                                    width: '72px',
                                    height: '72px',
                                    borderRadius: '8px',
                                    backgroundColor: '#f1f3f6',
                                    border: '2px solid var(--enforcement-red)',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    fontSize: '40px'
                                }}>
                                    {getVehicleEmoji(dominantVehicle)}
                                </div>
                                <div>
                                    <div style={{
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        fontFamily: 'var(--font-mono)',
                                        color: 'var(--fk-text)',
                                        letterSpacing: '1px'
                                    }}>{simulationData.uniquePlate}</div>
                                    <div style={{
                                        fontSize: '12px',
                                        color: 'var(--enforcement-red)',
                                        fontWeight: 'bold',
                                        marginTop: '4px',
                                        textTransform: 'uppercase',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <AlertTriangle size={14} />
                                        {clusterType === 'Junction Blocking' ? 'Critical Junction Blocker' : 'Midblock Obstruction'}
                                    </div>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', borderBottom: '1px solid #f1f3f6', paddingBottom: '10px' }}>
                                    <div style={{ width: '120px', fontSize: '12px', color: 'var(--fk-text-secondary)', fontWeight: 'bold' }}>OFFENSE</div>
                                    <div style={{ fontSize: '13px', color: 'var(--fk-text)', fontWeight: '600' }}>{dominantViolation || 'ILLEGAL PARKING'}</div>
                                </div>
                                <div style={{ display: 'flex', borderBottom: '1px solid #f1f3f6', paddingBottom: '10px' }}>
                                    <div style={{ width: '120px', fontSize: '12px', color: 'var(--fk-text-secondary)', fontWeight: 'bold' }}>VEHICLE TYPE</div>
                                    <div style={{ fontSize: '13px', color: 'var(--fk-text)', fontWeight: '600' }}>{displayVehicleType}</div>
                                </div>
                                <div style={{ display: 'flex', borderBottom: '1px solid #f1f3f6', paddingBottom: '10px' }}>
                                    <div style={{ width: '120px', fontSize: '12px', color: 'var(--fk-text-secondary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} />LOCATION</div>
                                    <div style={{ fontSize: '13px', color: 'var(--fk-text)', fontWeight: '600' }}>
                                        {junctionName !== 'No Junction' ? `${junctionName} (${policeStation})` : `Midblock Road (${policeStation})`}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', borderBottom: '1px solid #f1f3f6', paddingBottom: '10px' }}>
                                    <div style={{ width: '120px', fontSize: '12px', color: 'var(--fk-text-secondary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} />PEAK HOURS</div>
                                    <div style={{ fontSize: '13px', color: 'var(--fk-text)', fontWeight: '600' }}>{simulationData.timeFromTo}</div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{
                            backgroundColor: '#f1f3f6',
                            padding: '16px 20px',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px'
                        }}>
                            <button 
                                onClick={() => setShowModal(false)}
                                style={{
                                    padding: '8px 16px',
                                    border: '1px solid var(--fk-border)',
                                    borderRadius: '4px',
                                    backgroundColor: '#fff',
                                    color: 'var(--fk-text)',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                CLOSE
                            </button>
                            <button 
                                onClick={() => {
                                    alert('Patrol dispatch warning sent to ' + policeStation + ' towing units.');
                                    setShowModal(false);
                                }}
                                style={{
                                    padding: '8px 16px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--fk-blue)',
                                    color: '#fff',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                DISPATCH TOW PATROL
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
};
