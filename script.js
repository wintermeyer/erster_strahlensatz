document.addEventListener('DOMContentLoaded', function() {
    // Get the canvas and its context
    const canvas = document.getElementById('strahlensatzCanvas');
    const ctx = canvas.getContext('2d');
    
    // Get UI elements
    // Reset-Button entfernt
    
    // Strahlensatz-Rechner Elemente entfernt
    
    // Grid settings
    const gridSize = 20; // Size of each grid cell in pixels (1cm = 20px)
    const cmScale = gridSize; // 1cm = gridSize pixels
    
    // Define Z and initial ray points
    const Z = { x: 80, y: 340 }; // Z moved 6cm to the left (6cm = 120px at 20px/cm scale)
    const A = { x: 520, y: 400 }; // 2cm (40px) nach links verschoben von 560
    const B = { x: 360, y: 160 }; // 2cm (40px) nach links verschoben von 400
    
    // Calculate A' and B' using the intercept theorem (Strahlensatz)
    // We specify how far we want the second line to be from the first
    const distanceFactor = 1.5; // A' is 1.5 times further from Z than A

    // Calculate A' and B' precisely using the Strahlensatz
    const APrime = {
        x: Z.x + (A.x - Z.x) * distanceFactor,
        y: Z.y + (A.y - Z.y) * distanceFactor
    };
    
    const BPrime = {
        x: Z.x + (B.x - Z.x) * distanceFactor,
        y: Z.y + (B.y - Z.y) * distanceFactor
    };
    
    // Define initial positions for all points
    let points = {
        Z: Z,
        A: A,
        B: B,
        APrime: APrime,
        BPrime: BPrime
    };
    
    // Mouse interaction variables
    let isDragging = false;
    let selectedLine = null; // 'AB' or 'APrimeBPrime'
    let startDragY = 0;
    
    // Store original positions for reset
    const originalPoints = JSON.parse(JSON.stringify(points));
    
    // Direction vectors for the rays from Z
    const rayZA = {
        dx: A.x - Z.x,
        dy: A.y - Z.y
    };
    const rayZB = {
        dx: B.x - Z.x,
        dy: B.y - Z.y
    };
    
    // Helper functions for line-point distance calculation
    function distancePointToLine(point, lineStart, lineEnd) {
        const lineLength = Math.sqrt(
            Math.pow(lineEnd.x - lineStart.x, 2) + 
            Math.pow(lineEnd.y - lineStart.y, 2)
        );
        
        if (lineLength === 0) return Infinity;
        
        const t = (
            (point.x - lineStart.x) * (lineEnd.x - lineStart.x) + 
            (point.y - lineStart.y) * (lineEnd.y - lineStart.y)
        ) / (lineLength * lineLength);
        
        if (t < 0) {
            return Math.sqrt(
                Math.pow(point.x - lineStart.x, 2) + 
                Math.pow(point.y - lineStart.y, 2)
            );
        }
        if (t > 1) {
            return Math.sqrt(
                Math.pow(point.x - lineEnd.x, 2) + 
                Math.pow(point.y - lineEnd.y, 2)
            );
        }
        
        const projX = lineStart.x + t * (lineEnd.x - lineStart.x);
        const projY = lineStart.y + t * (lineEnd.y - lineStart.y);
        
        return Math.sqrt(
            Math.pow(point.x - projX, 2) + 
            Math.pow(point.y - projY, 2)
        );
    }
    
    // Function to check if mouse is near a line
    function isNearLine(mouseX, mouseY, line) {
        if (line === 'AB') {
            return distancePointToLine(
                { x: mouseX, y: mouseY }, 
                points.A, 
                points.B
            ) < 10; // 10px threshold
        } else if (line === 'APrimeBPrime') {
            return distancePointToLine(
                { x: mouseX, y: mouseY }, 
                points.APrime, 
                points.BPrime
            ) < 10;
        }
        return false;
    }
    
    // Function to update point positions to maintain Strahlensatz proportions
    function updatePointsOnRay(point, ray, newDistance) {
        // Calculate the unit vector of the ray
        const rayLength = Math.sqrt(ray.dx * ray.dx + ray.dy * ray.dy);
        const unitX = ray.dx / rayLength;
        const unitY = ray.dy / rayLength;
        
        // Set the point at the specified distance along the ray
        point.x = points.Z.x + unitX * newDistance;
        point.y = points.Z.y + unitY * newDistance;
        
        return point;
    }
    
    // Calculate distance from Z to a point
    function distanceFromZ(point) {
        return Math.sqrt(
            Math.pow(points.Z.x - point.x, 2) + 
            Math.pow(points.Z.y - point.y, 2)
        );
    }
    
    // Function to move parallel line AB
    function moveABLine(dragAmount) {
        // Calculate current distances of A and B from Z
        const distZA = distanceFromZ(points.A);
        const distZB = distanceFromZ(points.B);
        
        // Update distances based on drag amount (negative to invert direction)
        const newDistZA = distZA - dragAmount;
        const newDistZB = distZB - dragAmount;
        
        // Make sure the line stays within the visible area and doesn't cross Z
        if (newDistZA <= 0 || newDistZB <= 0) return;
        
        // First, update point A on its ray
        updatePointsOnRay(points.A, rayZA, newDistZA);
        
        // Get the ratio of distances to maintain proportionality (Strahlensatz)
        const ratio = distZB / distZA;
        
        // Update B using the same ratio from Z
        updatePointsOnRay(points.B, rayZB, newDistZA * ratio);
        
        // This preserves the ratio |ZA|/|ZB| according to the Strahlensatz
        // which ensures that AB remains parallel to A'B'
    }
    
    // Function to move parallel line A'B'
    function moveAPrimeBPrimeLine(dragAmount) {
        // Calculate current distances of A' and B' from Z
        const distZAPrime = distanceFromZ(points.APrime);
        const distZBPrime = distanceFromZ(points.BPrime);
        
        // Calculate current distances of A and B from Z for comparison
        const distZA = distanceFromZ(points.A);
        const distZB = distanceFromZ(points.B);
        
        // Update distances based on drag amount (negative to invert direction)
        const newDistZAPrime = distZAPrime - dragAmount;
        const newDistZBPrime = distZBPrime - dragAmount;
        
        // Make sure the line stays within the visible area and doesn't cross Z
        if (newDistZAPrime <= 0 || newDistZBPrime <= 0) return;
        
        // Additional check: Ensure A'B' does not move over AB (closer to Z than AB)
        // A' should always be further from Z than A
        if (newDistZAPrime <= distZA) return;
        
        // Check if the new positions would be within the canvas boundaries
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Calculate potential new positions
        const rayLengthA = Math.sqrt(rayZA.dx * rayZA.dx + rayZA.dy * rayZA.dy);
        const unitXA = rayZA.dx / rayLengthA;
        const unitYA = rayZA.dy / rayLengthA;
        
        const newAPrimeX = points.Z.x + unitXA * newDistZAPrime;
        const newAPrimeY = points.Z.y + unitYA * newDistZAPrime;
        
        const rayLengthB = Math.sqrt(rayZB.dx * rayZB.dx + rayZB.dy * rayZB.dy);
        const unitXB = rayZB.dx / rayLengthB;
        const unitYB = rayZB.dy / rayLengthB;
        
        const ratioPrime = distZBPrime / distZAPrime;
        const newBPrimeX = points.Z.x + unitXB * (newDistZAPrime * ratioPrime);
        const newBPrimeY = points.Z.y + unitYB * (newDistZAPrime * ratioPrime);
        
        // Check if the new positions are within canvas boundaries
        if (newAPrimeX < 0 || newAPrimeX > canvasWidth || 
            newAPrimeY < 0 || newAPrimeY > canvasHeight ||
            newBPrimeX < 0 || newBPrimeX > canvasWidth || 
            newBPrimeY < 0 || newBPrimeY > canvasHeight) {
            return; // Don't move if it would go outside the canvas
        }
        
        // First, update point A' on its ray
        updatePointsOnRay(points.APrime, rayZA, newDistZAPrime);
        
        // Get the ratio of distances to maintain proportionality (Strahlensatz)
        const ratio = distZBPrime / distZAPrime;
        
        // Update B' using the same ratio from Z
        updatePointsOnRay(points.BPrime, rayZB, newDistZAPrime * ratio);
        
        // This preserves the ratio |ZA'|/|ZB'| according to the Strahlensatz
        // which ensures that A'B' remains parallel to AB
    }
    
    // Function to draw the grid (graph paper) with axis labels
    function drawGrid() {
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.beginPath();
        ctx.strokeStyle = '#e0e0e0'; // Light gray color for grid
        ctx.lineWidth = 0.5;
        
        // Draw vertical grid lines with x-axis labels
        for (let x = 0; x <= width; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            
            // Add x-axis labels at the bottom (every 5 cells)
            if (x % (gridSize * 5) === 0) {
                const cmValue = x / cmScale;
                ctx.fillStyle = '#888';
                ctx.font = '10px Arial';
                ctx.fillText(cmValue, x - 3, height - 5);
            }
        }
        
        // Draw horizontal grid lines with y-axis labels (corrected orientation)
        for (let y = 0; y <= height; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            
            // Add y-axis labels at the left (every 5 cells)
            // Correct the orientation: larger y values are at the top in canvas
            if (y % (gridSize * 5) === 0) {
                const cmValue = Math.floor((height - y) / cmScale); // Reverse the y value
                ctx.fillStyle = '#888';
                ctx.font = '10px Arial';
                ctx.fillText(cmValue, 5, y + 3);
            }
        }
        
        ctx.stroke();
        ctx.closePath();
        
        // Draw slightly darker lines for every 5 grid cells (like main grid lines)
        ctx.beginPath();
        ctx.strokeStyle = '#c0c0c0'; // Darker gray for main grid lines
        ctx.lineWidth = 1;
        
        // Draw vertical main grid lines
        for (let x = 0; x <= width; x += gridSize * 5) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        
        // Draw horizontal main grid lines
        for (let y = 0; y <= height; y += gridSize * 5) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        
        ctx.stroke();
        ctx.closePath();
    }
    
    // Function to draw a point with label
    function drawPoint(x, y, label) {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#3498db';
        ctx.fill();
        ctx.closePath();
        
        ctx.font = '20px Arial';
        ctx.fillStyle = 'black';
        ctx.fillText(label, x + 10, y - 10);
    }
    
    // Function to draw a line between two points
    function drawLine(point1, point2, color = 'black', width = 2) {
        ctx.beginPath();
        ctx.moveTo(point1.x, point1.y);
        ctx.lineTo(point2.x, point2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
        ctx.closePath();
    }
    
    // Function to calculate distance in centimeters
    function calculateDistanceCm(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        const distancePixels = Math.sqrt(dx * dx + dy * dy);
        return distancePixels / cmScale;
    }
    
    // Function to display the length of a segment directly on the ray
    function displaySegmentLength(point1, point2, text) {
        // Calculate the midpoint of the segment
        const midX = (point1.x + point2.x) / 2;
        const midY = (point1.y + point2.y) / 2;
        
        // Calculate the direction vector
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        
        // Create a slightly offset position along the ray for text
        const offsetFactor = 0.1; // Small offset along the ray
        const textX = midX + dx * offsetFactor;
        const textY = midY + dy * offsetFactor;
        
        // Draw a small white background to make text more readable
        const textWidth = ctx.measureText(text).width;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(textX - 2, textY - 12, textWidth + 4, 16);
        
        // Draw the text along the ray
        ctx.font = '14px Arial';
        ctx.fillStyle = '#8e44ad';
        ctx.fillText(text, textX, textY);
    }
    
    // Function to extend a line beyond two points (for rays from Z)
    function drawRay(origin, throughPoint, color = 'black', width = 2) {
        // Calculate direction vector
        const dx = throughPoint.x - origin.x;
        const dy = throughPoint.y - origin.y;
        
        // Find intersection with canvas boundaries
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Calculate how far we need to extend to reach canvas boundaries
        // We'll find parameter t such that origin + t*direction vector hits the boundary
        let tMax = 1000; // Start with a large value
        
        // Check intersection with right edge (x = canvasWidth)
        if (dx > 0) {
            const tRight = (canvasWidth - origin.x) / dx;
            if (tRight < tMax) tMax = tRight;
        }
        
        // Check intersection with bottom edge (y = canvasHeight)
        if (dy > 0) {
            const tBottom = (canvasHeight - origin.y) / dy;
            if (tBottom < tMax) tMax = tBottom;
        }
        
        // Check intersection with left edge (x = 0)
        if (dx < 0) {
            const tLeft = -origin.x / dx;
            if (tLeft < tMax) tMax = tLeft;
        }
        
        // Check intersection with top edge (y = 0)
        if (dy < 0) {
            const tTop = -origin.y / dy;
            if (tTop < tMax) tMax = tTop;
        }
        
        // Calculate extension point
        const extendedX = origin.x + dx * tMax;
        const extendedY = origin.y + dy * tMax;
        
        // Draw the extended line from origin to boundary
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(extendedX, extendedY);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
        ctx.closePath();
    }
    
    // Function to draw the parallel lines
    function drawParallelLines() {
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // First line: through A and B
        const AB_dx = points.B.x - points.A.x;
        const AB_dy = points.B.y - points.A.y;
        
        // Find intersection points with canvas boundaries for AB line
        let tMinAB = -1000; // Start with a large negative value
        let tMaxAB = 1000;  // Start with a large positive value
        
        // Check intersection with right edge (x = canvasWidth)
        if (AB_dx !== 0) {
            const tRight = (canvasWidth - points.A.x) / AB_dx;
            if (AB_dx > 0) {
                if (tRight < tMaxAB) tMaxAB = tRight;
            } else {
                if (tRight > tMinAB) tMinAB = tRight;
            }
        }
        
        // Check intersection with bottom edge (y = canvasHeight)
        if (AB_dy !== 0) {
            const tBottom = (canvasHeight - points.A.y) / AB_dy;
            if (AB_dy > 0) {
                if (tBottom < tMaxAB) tMaxAB = tBottom;
            } else {
                if (tBottom > tMinAB) tMinAB = tBottom;
            }
        }
        
        // Check intersection with left edge (x = 0)
        if (AB_dx !== 0) {
            const tLeft = -points.A.x / AB_dx;
            if (AB_dx < 0) {
                if (tLeft < tMaxAB) tMaxAB = tLeft;
            } else {
                if (tLeft > tMinAB) tMinAB = tLeft;
            }
        }
        
        // Check intersection with top edge (y = 0)
        if (AB_dy !== 0) {
            const tTop = -points.A.y / AB_dy;
            if (AB_dy < 0) {
                if (tTop < tMaxAB) tMaxAB = tTop;
            } else {
                if (tTop > tMinAB) tMinAB = tTop;
            }
        }
        
        // Calculate extended points for AB line
        const startX1 = points.A.x + AB_dx * tMinAB;
        const startY1 = points.A.y + AB_dy * tMinAB;
        const endX1 = points.A.x + AB_dx * tMaxAB;
        const endY1 = points.A.y + AB_dy * tMaxAB;
        
        // Determine color based on whether the line is selected
        const lineABColor = (selectedLine === 'AB') ? '#ff00ff' : '#e74c3c';
        
        drawLine({x: startX1, y: startY1}, {x: endX1, y: endY1}, lineABColor, 2);
        
        // Second line: through A' and B'
        const APrimeBPrime_dx = points.BPrime.x - points.APrime.x;
        const APrimeBPrime_dy = points.BPrime.y - points.APrime.y;
        
        // Find intersection points with canvas boundaries for A'B' line
        let tMinAPrime = -1000; // Start with a large negative value
        let tMaxAPrime = 1000;  // Start with a large positive value
        
        // Check intersection with right edge (x = canvasWidth)
        if (APrimeBPrime_dx !== 0) {
            const tRight = (canvasWidth - points.APrime.x) / APrimeBPrime_dx;
            if (APrimeBPrime_dx > 0) {
                if (tRight < tMaxAPrime) tMaxAPrime = tRight;
            } else {
                if (tRight > tMinAPrime) tMinAPrime = tRight;
            }
        }
        
        // Check intersection with bottom edge (y = canvasHeight)
        if (APrimeBPrime_dy !== 0) {
            const tBottom = (canvasHeight - points.APrime.y) / APrimeBPrime_dy;
            if (APrimeBPrime_dy > 0) {
                if (tBottom < tMaxAPrime) tMaxAPrime = tBottom;
            } else {
                if (tBottom > tMinAPrime) tMinAPrime = tBottom;
            }
        }
        
        // Check intersection with left edge (x = 0)
        if (APrimeBPrime_dx !== 0) {
            const tLeft = -points.APrime.x / APrimeBPrime_dx;
            if (APrimeBPrime_dx < 0) {
                if (tLeft < tMaxAPrime) tMaxAPrime = tLeft;
            } else {
                if (tLeft > tMinAPrime) tMinAPrime = tLeft;
            }
        }
        
        // Check intersection with top edge (y = 0)
        if (APrimeBPrime_dy !== 0) {
            const tTop = -points.APrime.y / APrimeBPrime_dy;
            if (APrimeBPrime_dy < 0) {
                if (tTop < tMaxAPrime) tMaxAPrime = tTop;
            } else {
                if (tTop > tMinAPrime) tMinAPrime = tTop;
            }
        }
        
        // Calculate extended points for A'B' line
        const startX2 = points.APrime.x + APrimeBPrime_dx * tMinAPrime;
        const startY2 = points.APrime.y + APrimeBPrime_dy * tMinAPrime;
        const endX2 = points.APrime.x + APrimeBPrime_dx * tMaxAPrime;
        const endY2 = points.APrime.y + APrimeBPrime_dy * tMaxAPrime;
        
        // Determine color based on whether the line is selected
        const lineAPrimeBPrimeColor = (selectedLine === 'APrimeBPrime') ? '#ff00ff' : '#e74c3c';
        
        drawLine({x: startX2, y: startY2}, {x: endX2, y: endY2}, lineAPrimeBPrimeColor, 2);
    }
    
    // Function to highlight the grid point where Z is located
    function highlightZGridPoint() {
        const x = points.Z.x;
        const y = points.Z.y;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#f39c12'; // Orange highlight
        ctx.fill();
        ctx.closePath();
    }
    
    // Function to display the requested length measurements
    function displayLengths() {
        // Calculate distances in cm
        const distZA = calculateDistanceCm(points.Z, points.A);
        const distZB = calculateDistanceCm(points.Z, points.B);
        const distAAPrime = calculateDistanceCm(points.A, points.APrime);
        const distBBPrime = calculateDistanceCm(points.B, points.BPrime);
        
        // Display segment lengths with the unit cm
        displaySegmentLength(points.Z, points.A, `ZA: ${distZA.toFixed(1)} cm`);
        displaySegmentLength(points.Z, points.B, `ZB: ${distZB.toFixed(1)} cm`);
        displaySegmentLength(points.A, points.APrime, `AA': ${distAAPrime.toFixed(1)} cm`);
        displaySegmentLength(points.B, points.BPrime, `BB': ${distBBPrime.toFixed(1)} cm`);
    }
    
    // Function to update the cursor style
    function updateCursorStyle(x, y) {
        if (isNearLine(x, y, 'AB') || isNearLine(x, y, 'APrimeBPrime')) {
            canvas.style.cursor = 'move';
        } else {
            canvas.style.cursor = 'default';
        }
    }
    
    // Function to update visualization
    function updateVisualization() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw the grid
        drawGrid();
        
        // Highlight the grid point where Z is located
        highlightZGridPoint();
        
        // Draw parallel lines
        drawParallelLines();
        
        // Draw the two rays from Z
        drawRay(points.Z, points.A, '#2ecc71', 2);
        drawRay(points.Z, points.B, '#2ecc71', 2);
        
        // Draw all points
        drawPoint(points.Z.x, points.Z.y, 'Z');
        drawPoint(points.A.x, points.A.y, 'A');
        drawPoint(points.B.x, points.B.y, 'B');
        drawPoint(points.APrime.x, points.APrime.y, 'A\'');
        drawPoint(points.BPrime.x, points.BPrime.y, 'B\'');
        
        // Display lengths
        displayLengths();
        
        // Add "1 Kästchen = 1 cm" legend directly on canvas
        ctx.font = '14px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText("1 Kästchen = 1 cm", canvas.width - 150, 20);
        
        // Add interactive hint
        if (!isDragging) {
            ctx.fillStyle = '#666';
        }
    }
    
    // Initialize the visualization
    updateVisualization();
    
    // Demo animation function to show the effect of moving parallel lines
    function startDemoAnimation() {
        let animationStep = 0;
        const stepsPerLine = 120; // 2 seconds at 60fps per line
        const totalSteps = stepsPerLine * 2; // Two animations: AB and then A'B'
        const maxMovement = 3; // Maximum movement in distance units
        let animationActive = true;
        
        // Canvas boundaries for checking
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Zeige an, dass die Animation läuft
        function setAnimationIndicator(isActive) {
            if (isActive) {
                // Zeige visuellen Hinweis, dass die Animation läuft
                canvas.style.boxShadow = '0 0 15px rgba(0, 150, 255, 0.5)';
                canvas.style.transition = 'box-shadow 0.3s ease';
            } else {
                canvas.style.boxShadow = 'none';
            }
        }
        
        // Function to check if a point would be within canvas boundaries
        function isPointInCanvas(x, y) {
            const padding = 20; // Add padding to keep points a bit away from the edge
            return x >= padding && x <= canvasWidth - padding && 
                   y >= padding && y <= canvasHeight - padding;
        }
        
        setAnimationIndicator(true);
        
        function animateStep() {
            if (!animationActive) return;
            
            animationStep++;
            
            if (animationStep <= totalSteps) {
                // Erste Hälfte: AB-Linie animieren
                if (animationStep <= stepsPerLine) {
                    // Calculate sinusoidal movement - one full cycle for AB line
                    const progress = animationStep / stepsPerLine;
                    const sinValue = Math.sin(progress * Math.PI * 2);
                    
                    // Get original distances
                    const originalDistZA = distanceFromZ(originalPoints.A);
                    
                    // Calculate new distance with sinusoidal variation
                    const newDistZA = originalDistZA + sinValue * maxMovement * gridSize;
                    
                    // Only move if the points would stay within the canvas
                    const rayLengthA = Math.sqrt(rayZA.dx * rayZA.dx + rayZA.dy * rayZA.dy);
                    const unitXA = rayZA.dx / rayLengthA;
                    const unitYA = rayZA.dy / rayLengthA;
                    const newAX = points.Z.x + unitXA * newDistZA;
                    const newAY = points.Z.y + unitYA * newDistZA;
                    
                    const ratio = distanceFromZ(originalPoints.B) / distanceFromZ(originalPoints.A);
                    const rayLengthB = Math.sqrt(rayZB.dx * rayZB.dx + rayZB.dy * rayZB.dy);
                    const unitXB = rayZB.dx / rayLengthB;
                    const unitYB = rayZB.dy / rayLengthB;
                    const newBX = points.Z.x + unitXB * (newDistZA * ratio);
                    const newBY = points.Z.y + unitYB * (newDistZA * ratio);
                    
                    if (isPointInCanvas(newAX, newAY) && isPointInCanvas(newBX, newBY)) {
                        // Update point A
                        updatePointsOnRay(points.A, rayZA, newDistZA);
                        
                        // Update point B while maintaining the ratio
                        updatePointsOnRay(points.B, rayZB, newDistZA * ratio);
                    }
                }
                // Zweite Hälfte: A'B'-Linie animieren
                else {
                    // Wenn die erste Animation abgeschlossen ist, setzen wir AB auf Originalposition zurück
                    if (animationStep === stepsPerLine + 1) {
                        // Reset AB to original positions
                        points.A = JSON.parse(JSON.stringify(originalPoints.A));
                        points.B = JSON.parse(JSON.stringify(originalPoints.B));
                    }
                    
                    // Calculate sinusoidal movement for A'B' line (allow full movement)
                    const progressAPrime = (animationStep - stepsPerLine) / stepsPerLine;
                    const sinValueAPrime = Math.sin(progressAPrime * Math.PI * 2);
                    
                    // Calculate original distances
                    const originalDistZAPrime = distanceFromZ(originalPoints.APrime);
                    const currentDistZA = distanceFromZ(points.A); // A bleibt jetzt fest
                    
                    // Verwende den vollen Sinus-Wert (nicht absolut), um Bewegung in beide Richtungen zu ermöglichen
                    const newDistZAPrime = originalDistZAPrime + sinValueAPrime * maxMovement * gridSize;
                    
                    // Stelle sicher, dass A'B' nicht über AB liegt und innerhalb des Canvas bleibt
                    if (newDistZAPrime > currentDistZA) {
                        // Calculate potential new positions for checking
                        const rayLengthA = Math.sqrt(rayZA.dx * rayZA.dx + rayZA.dy * rayZA.dy);
                        const unitXA = rayZA.dx / rayLengthA;
                        const unitYA = rayZA.dy / rayLengthA;
                        const newAPrimeX = points.Z.x + unitXA * newDistZAPrime;
                        const newAPrimeY = points.Z.y + unitYA * newDistZAPrime;
                        
                        const ratioPrime = distanceFromZ(originalPoints.BPrime) / distanceFromZ(originalPoints.APrime);
                        const rayLengthB = Math.sqrt(rayZB.dx * rayZB.dx + rayZB.dy * rayZB.dy);
                        const unitXB = rayZB.dx / rayLengthB;
                        const unitYB = rayZB.dy / rayLengthB;
                        const newBPrimeX = points.Z.x + unitXB * (newDistZAPrime * ratioPrime);
                        const newBPrimeY = points.Z.y + unitYB * (newDistZAPrime * ratioPrime);
                        
                        if (isPointInCanvas(newAPrimeX, newAPrimeY) && isPointInCanvas(newBPrimeX, newBPrimeY)) {
                            // Update A'
                            updatePointsOnRay(points.APrime, rayZA, newDistZAPrime);
                            
                            // Update B' while maintaining the ratio
                            updatePointsOnRay(points.BPrime, rayZB, newDistZAPrime * ratioPrime);
                        }
                    }
                }
                
                // Update visualization after movement
                updateVisualization();
                
                // Continue animation
                requestAnimationFrame(animateStep);
            } else {
                // Animation complete - reset to original positions
                points = JSON.parse(JSON.stringify(originalPoints));
                updateVisualization();
                animationActive = false;
                setAnimationIndicator(false);
            }
        }
        
        // Start the animation
        animationActive = true;
        requestAnimationFrame(animateStep);
    }
    
    // Start demo animation after a short delay to let the page fully render
    setTimeout(startDemoAnimation, 700);
    
    // Mouse event listeners for interaction
    canvas.addEventListener('mousedown', function(e) {
        // Get mouse position
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Check if we clicked near either line
        if (isNearLine(mouseX, mouseY, 'AB')) {
            isDragging = true;
            selectedLine = 'AB';
            startDragY = mouseY;
        } else if (isNearLine(mouseX, mouseY, 'APrimeBPrime')) {
            isDragging = true;
            selectedLine = 'APrimeBPrime';
            startDragY = mouseY;
        }
        
        // Update visualization to show the selected line
        updateVisualization();
    });
    
    canvas.addEventListener('mousemove', function(e) {
        // Get mouse position
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Update cursor
        if (!isDragging) {
            updateCursorStyle(mouseX, mouseY);
        }
        
        if (isDragging) {
            // Calculate drag amount
            const dragAmount = mouseY - startDragY;
            startDragY = mouseY;
            
            // Scale the drag amount for better control
            const scaledDrag = dragAmount * 0.5;
            
            if (selectedLine === 'AB') {
                moveABLine(scaledDrag);
            } else if (selectedLine === 'APrimeBPrime') {
                moveAPrimeBPrimeLine(scaledDrag);
            }
            
            updateVisualization();
        }
    });
    
    canvas.addEventListener('mouseup', function() {
        isDragging = false;
        selectedLine = null;
        updateVisualization();
    });
    
    canvas.addEventListener('mouseleave', function() {
        isDragging = false;
        selectedLine = null;
        updateVisualization();
    });
    
    // Make visualization responsive
    window.addEventListener('resize', function() {
        updateVisualization();
    });
    
    // Strahlensatz-Rechner Funktionalität entfernt
}); 