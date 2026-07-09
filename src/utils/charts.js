/**
 * Custom SVG Line Chart Generator for Trajectory Plots
 * Renders a gorgeous, responsive, high-contrast volt-green line chart.
 * Supports highlighting a specific index and custom/dynamic Y scaling.
 */
export function generateSvgLineChart(dataPoints, width = 600, height = 220, highlightIndex = -1, customMin = null, customMax = null) {
  if (!dataPoints || dataPoints.length === 0) return '';
  
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 35;
  
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  
  const values = dataPoints.map(dp => dp.value);
  let minVal = customMin !== null ? customMin : Math.min(...values);
  let maxVal = customMax !== null ? customMax : Math.max(...values);
  
  if (minVal === maxVal) {
    minVal = minVal - 1;
    maxVal = maxVal + 1;
  } else {
    // Add 10% padding to prevent cutoffs
    const pad = (maxVal - minVal) * 0.1;
    if (customMin === null) minVal = minVal - pad;
    if (customMax === null) maxVal = maxVal + pad;
  }
  
  const range = maxVal - minVal || 1;
  
  const points = dataPoints.map((dp, i) => {
    const x = dataPoints.length === 1 
      ? paddingLeft + chartWidth / 2 
      : paddingLeft + (i / (dataPoints.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((dp.value - minVal) / range) * chartHeight;
    return { x, y, value: dp.value, label: dp.label };
  });
  
  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPoints = dataPoints.length > 1 
    ? `${points[0].x},${paddingTop + chartHeight} ` + polylinePoints + ` ${points[points.length - 1].x},${paddingTop + chartHeight}`
    : '';
                   
  // Generate 5 dynamic Y ticks based on actual range
  const yTicks = [];
  for (let i = 0; i <= 4; i++) {
    yTicks.push(minVal + (range * i) / 4);
  }
  const yGridLines = yTicks.map(tick => {
    const y = paddingTop + chartHeight - ((tick - minVal) / range) * chartHeight;
    // Format decimals only for small values (e.g. Cowan's K)
    const tickStr = Math.abs(tick) < 10 ? tick.toFixed(1) : Math.round(tick).toString();
    return `
      <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
      <text x="${paddingLeft - 10}" y="${y + 4}" fill="rgba(255,255,255,0.4)" font-family="var(--font-mono)" font-size="10" text-anchor="end">${tickStr}</text>
    `;
  }).join('');

  const xLabels = points.map((p, i) => {
    const showLabel = dataPoints.length <= 8 || i === 0 || i === dataPoints.length - 1 || i === Math.floor(dataPoints.length / 2) || (dataPoints.length > 8 && i % 2 === 0);
    if (!showLabel) return '';
    return `
      <text x="${p.x}" y="${height - 12}" fill="rgba(255,255,255,0.4)" font-family="var(--font-mono)" font-size="10" text-anchor="middle">${p.label}</text>
      <line x1="${p.x}" y1="${paddingTop}" x2="${p.x}" y2="${paddingTop + chartHeight}" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
    `;
  }).join('');
  
  const dots = points.map((p, i) => {
    const isHighlighted = i === highlightIndex;
    const dotColor = isHighlighted ? '#ffffff' : 'url(#chartGrad)';
    const textFill = isHighlighted ? '#ffffff' : '#d4ff00';
    const radius = isHighlighted ? 10 : 8;
    const strokeWidth = isHighlighted ? 4 : 3;
    
    // Format values nicely
    const valStr = Math.abs(p.value) < 10 ? p.value.toFixed(2) : Math.round(p.value).toString();
    
    return `
      <g class="chart-dot-group" style="cursor: pointer;">
        <circle cx="${p.x}" cy="${p.y}" r="${radius}" fill="rgba(0, 0, 0, 0.7)" stroke="${dotColor}" stroke-width="${strokeWidth}" />
        <circle cx="${p.x}" cy="${p.y}" r="3" fill="#fff" />
        <text x="${p.x}" y="${p.y - (isHighlighted ? 16 : 14)}" fill="${textFill}" font-family="var(--font-mono)" font-size="11" font-weight="bold" text-anchor="middle">${valStr}</text>
      </g>
    `;
  }).join('');

  return `
    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#d4ff00"/>
          <stop offset="100%" stop-color="#8aff00"/>
        </linearGradient>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#d4ff00" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#8aff00" stop-opacity="0.0"/>
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <!-- Gridlines -->
      ${yGridLines}
      
      <!-- Area Under the Curve -->
      ${dataPoints.length > 1 ? `<polygon points="${areaPoints}" fill="url(#areaGrad)" />` : ''}
      
      <!-- The Line -->
      ${dataPoints.length > 1 ? `<polyline points="${polylinePoints}" stroke="url(#chartGrad)" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)" />` : ''}
      
      <!-- X Labels -->
      ${xLabels}
      
      <!-- Ticks / Dots -->
      ${dots}
    </svg>
  `;
}
